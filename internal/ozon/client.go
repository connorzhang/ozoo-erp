package ozon

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"
)

type Client struct {
	baseURL  string
	clientID string
	apiKey   string
	http     *http.Client
}

type Options struct {
	BaseURL  string
	ClientID string
	APIKey   string
	Timeout  time.Duration
}

func New(opts Options) *Client {
	timeout := opts.Timeout
	if timeout <= 0 {
		timeout = 30 * time.Second
	}
	return &Client{
		baseURL:  strings.TrimRight(opts.BaseURL, "/"),
		clientID: opts.ClientID,
		apiKey:   opts.APIKey,
		http: &http.Client{
			Timeout: timeout,
		},
	}
}

func (c *Client) PostJSON(ctx context.Context, path string, reqBody any, respBody any) (int, []byte, error) {
	return c.doJSON(ctx, http.MethodPost, path, reqBody, respBody)
}

func (c *Client) doJSON(ctx context.Context, method, path string, reqBody any, respBody any) (int, []byte, error) {
	var body io.Reader
	if reqBody != nil {
		b, err := json.Marshal(reqBody)
		if err != nil {
			return 0, nil, err
		}
		body = bytes.NewReader(b)
	} else {
		body = bytes.NewReader([]byte("{}"))
	}

	url := c.baseURL + path

	var lastErr error
	backoff := 800 * time.Millisecond
	for attempt := 0; attempt < 4; attempt++ {
		req, err := http.NewRequestWithContext(ctx, method, url, body)
		if err != nil {
			return 0, nil, err
		}
		if seeker, ok := body.(io.Seeker); ok {
			_, _ = seeker.Seek(0, io.SeekStart)
		}

		req.Header.Set("Client-Id", c.clientID)
		req.Header.Set("Api-Key", c.apiKey)
		req.Header.Set("Accept", "application/json")
		req.Header.Set("Content-Type", "application/json")

		res, err := c.http.Do(req)
		if err != nil {
			lastErr = err
			select {
			case <-time.After(backoff):
				backoff *= 2
				continue
			case <-ctx.Done():
				return 0, nil, ctx.Err()
			}
		}

		raw, readErr := readAllLimit(res.Body, 8<<20)
		_ = res.Body.Close()
		if readErr != nil {
			return res.StatusCode, nil, readErr
		}

		if res.StatusCode >= 200 && res.StatusCode < 300 {
			if respBody != nil && len(raw) > 0 {
				if err := json.Unmarshal(raw, respBody); err != nil {
					return res.StatusCode, raw, err
				}
			}
			return res.StatusCode, raw, nil
		}

		if shouldRetry(res.StatusCode) {
			lastErr = fmt.Errorf("ozon status=%d body=%s", res.StatusCode, compact(raw, 1200))
			delay := retryAfter(res.Header.Get("Retry-After"), backoff)
			select {
			case <-time.After(delay):
				backoff *= 2
				continue
			case <-ctx.Done():
				return res.StatusCode, raw, ctx.Err()
			}
		}

		return res.StatusCode, raw, fmt.Errorf("ozon status=%d body=%s", res.StatusCode, compact(raw, 2000))
	}

	if lastErr == nil {
		lastErr = errors.New("ozon request failed")
	}
	return 0, nil, lastErr
}

func shouldRetry(code int) bool {
	switch code {
	case http.StatusTooManyRequests, http.StatusBadGateway, http.StatusServiceUnavailable, http.StatusGatewayTimeout, http.StatusInternalServerError:
		return true
	default:
		return false
	}
}

func retryAfter(v string, fallback time.Duration) time.Duration {
	v = strings.TrimSpace(v)
	if v == "" {
		return fallback
	}
	sec, err := strconv.Atoi(v)
	if err != nil || sec <= 0 {
		return fallback
	}
	return time.Duration(sec) * time.Second
}

func compact(b []byte, n int) string {
	s := strings.TrimSpace(string(b))
	if len(s) <= n {
		return s
	}
	return s[:n]
}

func readAllLimit(r io.Reader, limit int64) ([]byte, error) {
	lr := &io.LimitedReader{R: r, N: limit + 1}
	b, err := io.ReadAll(lr)
	if err != nil {
		return nil, err
	}
	if int64(len(b)) > limit {
		return nil, errors.New("response too large")
	}
	return b, nil
}

