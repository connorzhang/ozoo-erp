package app

import (
	"context"
	"crypto/md5"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math/rand"
	"net/http"
	"net/url"
	"regexp"
	"sync"
	"strings"
	"time"
)

type translateReq struct {
	Texts []string `json:"texts"`
	From  string   `json:"from"`
	To    string   `json:"to"`
}

type translateItem struct {
	Text       string `json:"text"`
	Translated string `json:"translated"`
	Error      string `json:"error,omitempty"`
}

type translateResp struct {
	Items []translateItem `json:"items"`
}

func (s *Server) handleTranslate(w http.ResponseWriter, r *http.Request) {
	var req translateReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "invalid json"})
		return
	}
	req.From = strings.TrimSpace(req.From)
	req.To = strings.TrimSpace(req.To)
	if req.To == "" {
		req.To = "zh"
	}
	if req.From == "" {
		req.From = "auto"
	}
	if len(req.Texts) == 0 {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "texts is required"})
		return
	}
	if len(req.Texts) > 100 {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "too many texts"})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 90*time.Second)
	defer cancel()

	texts := make([]string, 0, len(req.Texts))
	seen := map[string]bool{}
	for _, t := range req.Texts {
		t = strings.TrimSpace(t)
		if t == "" || seen[t] {
			continue
		}
		seen[t] = true
		texts = append(texts, t)
	}
	if len(texts) == 0 {
		writeJSON(w, http.StatusOK, translateResp{Items: []translateItem{}})
		return
	}

	type job struct {
		i int
		t string
	}
	jobs := make(chan job)
	results := make([]translateItem, len(texts))

	workers := 6
	var wg sync.WaitGroup
	wg.Add(workers)
	for wkr := 0; wkr < workers; wkr++ {
		go func() {
			defer wg.Done()
			for j := range jobs {
				item := translateItem{Text: j.t}
				oneCtx, cancel := context.WithTimeout(ctx, 20*time.Second)
				translated, err := s.translateOne(oneCtx, req.From, req.To, j.t)
				cancel()
				if err != nil {
					item.Error = err.Error()
				} else {
					item.Translated = translated
				}
				results[j.i] = item
			}
		}()
	}

	for i, t := range texts {
		select {
		case <-ctx.Done():
			break
		case jobs <- job{i: i, t: t}:
		}
	}
	close(jobs)
	wg.Wait()

	writeJSON(w, http.StatusOK, translateResp{Items: results})
}

func (s *Server) translateOne(ctx context.Context, from string, to string, text string) (string, error) {
	provider := strings.ToLower(strings.TrimSpace(s.cfg.TranslateProvider))
	if provider == "" {
		provider = "auto"
	}

	switch provider {
	case "auto":
		if s.cfg.BaiduTranslateAppID != "" && s.cfg.BaiduTranslateKey != "" {
			return translateBaidu(ctx, s.cfg.BaiduTranslateAppID, s.cfg.BaiduTranslateKey, from, to, text)
		}
		return translateMyMemory(ctx, from, to, text)
	case "baidu":
		if s.cfg.BaiduTranslateAppID == "" || s.cfg.BaiduTranslateKey == "" {
			return "", errors.New("translator not configured: set BAIDU_TRANSLATE_APP_ID and BAIDU_TRANSLATE_KEY in .env (or set TRANSLATE_PROVIDER=auto to use free fallback)")
		}
		return translateBaidu(ctx, s.cfg.BaiduTranslateAppID, s.cfg.BaiduTranslateKey, from, to, text)
	case "mymemory":
		return translateMyMemory(ctx, from, to, text)
	default:
		return "", fmt.Errorf("unknown translate provider: %s", s.cfg.TranslateProvider)
	}
}

func translateBaidu(ctx context.Context, appID string, key string, from string, to string, text string) (string, error) {
	salt := fmt.Sprintf("%d", rand.New(rand.NewSource(time.Now().UnixNano())).Int63())
	sign := md5Hex(appID + text + salt + key)

	u := url.URL{
		Scheme: "https",
		Host:   "fanyi-api.baidu.com",
		Path:   "/api/trans/vip/translate",
	}
	q := u.Query()
	q.Set("appid", appID)
	q.Set("q", text)
	q.Set("from", from)
	q.Set("to", to)
	q.Set("salt", salt)
	q.Set("sign", sign)
	u.RawQuery = q.Encode()

	req, err := http.NewRequestWithContext(ctx, "GET", u.String(), nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("User-Agent", "ozon-erp/1.0")
	req.Header.Set("Accept", "application/json")

	res, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer res.Body.Close()

	b, _ := io.ReadAll(res.Body)
	if res.StatusCode < 200 || res.StatusCode > 299 {
		return "", fmt.Errorf("translate http %d", res.StatusCode)
	}

	var out struct {
		ErrorCode   string `json:"error_code"`
		ErrorMsg    string `json:"error_msg"`
		TransResult []struct {
			Src string `json:"src"`
			Dst string `json:"dst"`
		} `json:"trans_result"`
	}
	if err := json.Unmarshal(b, &out); err != nil {
		return "", errors.New("translate parse error")
	}
	if out.ErrorCode != "" && out.ErrorCode != "0" {
		if out.ErrorMsg != "" {
			return "", fmt.Errorf("translate error: %s", out.ErrorMsg)
		}
		return "", fmt.Errorf("translate error_code: %s", out.ErrorCode)
	}
	if len(out.TransResult) == 0 {
		return "", errors.New("translate empty result")
	}
	return strings.TrimSpace(out.TransResult[0].Dst), nil
}

var reCyrillic = regexp.MustCompile(`[\p{Cyrillic}]`)

func translateMyMemory(ctx context.Context, from string, to string, text string) (string, error) {
	if strings.TrimSpace(to) == "" {
		to = "zh"
	}
	from = strings.TrimSpace(from)
	if from == "" || from == "auto" {
		if reCyrillic.MatchString(text) {
			from = "ru"
		} else {
			from = "en"
		}
	}

	to = normalizeToLang(to)
	from = normalizeFromLang(from)

	u := url.URL{
		Scheme: "https",
		Host:   "api.mymemory.translated.net",
		Path:   "/get",
	}
	q := u.Query()
	q.Set("q", text)
	q.Set("langpair", fmt.Sprintf("%s|%s", from, to))
	u.RawQuery = q.Encode()

	req, err := http.NewRequestWithContext(ctx, "GET", u.String(), nil)
	if err != nil {
		return "", err
	}
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer res.Body.Close()

	b, _ := io.ReadAll(res.Body)
	if res.StatusCode < 200 || res.StatusCode > 299 {
		return "", fmt.Errorf("translate http %d", res.StatusCode)
	}

	var out struct {
		ResponseData struct {
			TranslatedText string `json:"translatedText"`
		} `json:"responseData"`
		ResponseStatus int `json:"responseStatus"`
	}
	if err := json.Unmarshal(b, &out); err != nil {
		return "", errors.New("translate parse error")
	}
	if out.ResponseStatus != 200 {
		return "", errors.New("translate failed")
	}
	return strings.TrimSpace(out.ResponseData.TranslatedText), nil
}

func normalizeToLang(v string) string {
	s := strings.ToLower(strings.TrimSpace(v))
	switch s {
	case "zh", "zh-cn", "zh_cn", "cn":
		return "zh-CN"
	default:
		return s
	}
}

func normalizeFromLang(v string) string {
	s := strings.ToLower(strings.TrimSpace(v))
	switch s {
	case "zh", "zh-cn", "zh_cn", "cn":
		return "zh-CN"
	default:
		return s
	}
}

func md5Hex(s string) string {
	sum := md5.Sum([]byte(s))
	return hex.EncodeToString(sum[:])
}
