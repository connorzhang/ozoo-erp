package app

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"
)

type OptimizeRequest struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Category    string `json:"category"`
	Language    string `json:"language"` // "ru" or "en"
}

type OptimizeResponse struct {
	OptimizedName        string `json:"optimized_name"`
	OptimizedDescription string `json:"optimized_description"`
	Keywords             string `json:"keywords"`
}

func (s *Server) handleAIOptimize(w http.ResponseWriter, r *http.Request) {
	var req OptimizeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "invalid json"})
		return
	}

	apiKey := os.Getenv("OPENAI_API_KEY")
	if apiKey == "" {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{"error": "OPENAI_API_KEY is not configured"})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 60*time.Second)
	defer cancel()

	resp, err := callOpenAI(ctx, apiKey, req)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, resp)
}

func callOpenAI(ctx context.Context, apiKey string, req OptimizeRequest) (*OptimizeResponse, error) {
	lang := "Russian"
	if req.Language == "en" {
		lang = "English"
	}

	prompt := fmt.Sprintf(`You are an expert e-commerce copywriter for Ozon. 
Please optimize the following product information for maximum sales conversion.
Target Language: %s

Original Name: %s
Original Description: %s
Category: %s

Please provide the output in JSON format with the following keys:
- "optimized_name": A catchy, SEO-friendly title in %s.
- "optimized_description": A detailed, persuasive, and structured description in %s. Use basic HTML formatting (like <p>, <ul>, <li>, <strong>) if appropriate.
- "keywords": A comma-separated list of relevant search keywords in %s.

Do not output any markdown code blocks like ~~~json, just the raw JSON string.`, lang, req.Name, req.Description, req.Category, lang, lang, lang)

	bodyData := map[string]any{
		"model": "gpt-4o",
		"messages": []map[string]any{
			{
				"role":    "system",
				"content": "You are a helpful assistant that strictly outputs JSON.",
			},
			{
				"role":    "user",
				"content": prompt,
			},
		},
		"response_format": map[string]any{"type": "json_object"},
		"temperature":     0.7,
	}

	bodyBytes, _ := json.Marshal(bodyData)
	httpReq, err := http.NewRequestWithContext(ctx, "POST", "https://api.openai.com/v1/chat/completions", bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, err
	}

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+apiKey)

	client := &http.Client{}
	res, err := client.Do(httpReq)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()

	if res.StatusCode != 200 {
		respBody, _ := io.ReadAll(res.Body)
		return nil, fmt.Errorf("openai error: %s", string(respBody))
	}

	var out struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}

	if err := json.NewDecoder(res.Body).Decode(&out); err != nil {
		return nil, err
	}

	if len(out.Choices) == 0 {
		return nil, errors.New("empty response from openai")
	}

	var optResp OptimizeResponse
	if err := json.Unmarshal([]byte(out.Choices[0].Message.Content), &optResp); err != nil {
		return nil, fmt.Errorf("failed to parse json from ai: %v", err)
	}

	return &optResp, nil
}
