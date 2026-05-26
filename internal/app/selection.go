package app

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/xuri/excelize/v2"
)

type ParsedSelectionItem struct {
	ID              string  `json:"id"`
	Name            string  `json:"name"`
	Cost            float64 `json:"cost"`
	Profit          float64 `json:"profit"`
	SourceURL       string  `json:"source_url"`
	SourcePlatform  string  `json:"source_platform"`
	ImageURL        string  `json:"image_url"` // Placeholder or real URL
}

func (s *Server) handleImportExcel(w http.ResponseWriter, r *http.Request) {
	// Parse multipart form
	if err := r.ParseMultipartForm(10 << 20); err != nil { // 10 MB limit
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Failed to parse form: " + err.Error()})
		return
	}

	file, _, err := r.FormFile("file")
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Failed to get file: " + err.Error()})
		return
	}
	defer file.Close()

	// Open Excel file
	f, err := excelize.OpenReader(file)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Failed to open Excel: " + err.Error()})
		return
	}
	defer f.Close()

	// Use first sheet
	sheetName := f.GetSheetName(0)
	rows, err := f.GetRows(sheetName)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Failed to read rows: " + err.Error()})
		return
	}

	if len(rows) < 2 {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Excel is empty or missing data rows"})
		return
	}

	// Map headers
	headers := rows[0]
	colIdx := make(map[string]int)
	for i, h := range headers {
		colIdx[strings.TrimSpace(h)] = i
	}

	var items []ParsedSelectionItem

	// Try to find the relevant columns
	costIdx, hasCost := colIdx["成本"]
	profitIdx, hasProfit := colIdx["利润"]
	sourceIdx, hasSource := colIdx["1688链接/拼多多"]
	
	// Fallbacks if not exact match
	if !hasSource {
		for k, v := range colIdx {
			if strings.Contains(k, "链接") || strings.Contains(k, "1688") || strings.Contains(k, "拼多多") {
				sourceIdx = v
				hasSource = true
				break
			}
		}
	}

	for i := 1; i < len(rows); i++ {
		row := rows[i]
		if len(row) == 0 {
			continue
		}

		item := ParsedSelectionItem{
			ID:   fmt.Sprintf("item_%d", i),
			Name: fmt.Sprintf("导入商品 %d", i),
		}

		// Try to read cost
		if hasCost && costIdx < len(row) {
			if val, err := strconv.ParseFloat(row[costIdx], 64); err == nil {
				item.Cost = val
			}
		}

		// Try to read profit
		if hasProfit && profitIdx < len(row) {
			if val, err := strconv.ParseFloat(row[profitIdx], 64); err == nil {
				item.Profit = val
			}
		}

		// Try to read source link
		if hasSource && sourceIdx < len(row) {
			link := strings.TrimSpace(row[sourceIdx])
			item.SourceURL = link
			if strings.Contains(link, "1688.com") {
				item.SourcePlatform = "1688"
			} else if strings.Contains(link, "yangkeduo.com") || strings.Contains(link, "pinduoduo.com") {
				item.SourcePlatform = "拼多多"
			} else if link != "" {
				item.SourcePlatform = "其他"
			}
		}

		items = append(items, item)
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"ok":    true,
		"count": len(items),
		"items": items,
	})
}
