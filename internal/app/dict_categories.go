package app

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	"ozon-erp/internal/store"
)

func (s *Server) handleDictCategoryCascader(w http.ResponseWriter, r *http.Request) {
	if s.catStore == nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "mysql not configured"})
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()
	tree, err := s.catStore.CascaderTree(ctx)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "items": tree})
}

func (s *Server) handleDictCategorySync(w http.ResponseWriter, r *http.Request) {
	if s.catStore == nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "mysql not configured"})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 120*time.Second)
	defer cancel()

	var outEN any
	statusEN, _, err := s.ozon.PostJSON(ctx, "/v1/description-category/tree", map[string]any{"language": "EN"}, &outEN)
	if err != nil {
		writeJSON(w, statusOr(statusEN, err), map[string]any{"error": err.Error()})
		return
	}

	var outRU any
	_, _, _ = s.ozon.PostJSON(ctx, "/v1/description-category/tree", map[string]any{"language": "RU"}, &outRU)
	ruMap := make(map[int64]string)
	if outRU != nil {
		for _, it := range flattenNamesOnly(outRU) {
			ruMap[it.ID] = it.Name
		}
	}

	base := flattenStructure(outEN)
	rows := make([]store.CategoryRow, 0, len(base))
	for _, it := range base {
		r := store.CategoryRow{
			ID:            it.ID,
			ParentID:      it.ParentID,
			Depth:         it.Depth,
			NameEN:        it.Name,
			NameRU:        ruMap[it.ID],
			ChildrenCount: it.ChildrenCount,
			TypeID:        it.TypeID,
		}
		rows = append(rows, r)
	}

	if err := s.catStore.Upsert(ctx, rows); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "count": len(rows)})
}

type flatItem struct {
	ID            int64
	ParentID      *int64
	Depth         int
	Name          string
	ChildrenCount int
	TypeID        *int64
}

func flattenStructure(v any) []flatItem {
	root := extractResultArray(v)
	out := make([]flatItem, 0, 800)
	var walk func(n any, parentID *int64, depth int)
	walk = func(n any, parentID *int64, depth int) {
		m, ok := n.(map[string]any)
		if !ok {
			return
		}
		id, ok := toInt64(firstKey(m, "description_category_id", "category_id", "id"))
		if !ok {
			return
		}
		name := toString(firstKey(m, "category_name", "title", "name"))

		var typeID *int64
		if v, ok := toInt64(firstKey(m, "type_id")); ok {
			tmp := v
			typeID = &tmp
		}

		children := toArray(m["children"])
		childCount := 0
		for _, c := range children {
			cm, ok := c.(map[string]any)
			if !ok {
				continue
			}
			if _, ok := toInt64(firstKey(cm, "description_category_id", "category_id", "id")); !ok {
				continue
			}
			if strings.TrimSpace(toString(firstKey(cm, "category_name", "title", "name"))) == "" {
				continue
			}
			childCount++
		}

		out = append(out, flatItem{ID: id, ParentID: parentID, Depth: depth, Name: name, ChildrenCount: childCount, TypeID: typeID})
		for _, c := range children {
			tmp := id
			walk(c, &tmp, depth+1)
		}
	}
	for _, n := range root {
		walk(n, nil, 0)
	}
	return out
}

type nameOnly struct {
	ID   int64
	Name string
}

func flattenNamesOnly(v any) []nameOnly {
	root := extractResultArray(v)
	out := make([]nameOnly, 0, 800)
	var walk func(n any)
	walk = func(n any) {
		m, ok := n.(map[string]any)
		if !ok {
			return
		}
		id, ok := toInt64(firstKey(m, "description_category_id", "category_id", "id"))
		if !ok {
			return
		}
		name := toString(firstKey(m, "category_name", "title", "name"))
		out = append(out, nameOnly{ID: id, Name: name})
		for _, c := range toArray(m["children"]) {
			walk(c)
		}
	}
	for _, n := range root {
		walk(n)
	}
	return out
}

func extractResultArray(v any) []any {
	if v == nil {
		return nil
	}
	if arr, ok := v.([]any); ok {
		return arr
	}
	if m, ok := v.(map[string]any); ok {
		if res, ok := m["result"].([]any); ok {
			return res
		}
	}
	return nil
}

func firstKey(m map[string]any, keys ...string) any {
	for _, k := range keys {
		if v, ok := m[k]; ok {
			return v
		}
	}
	return nil
}

func toArray(v any) []any {
	if v == nil {
		return nil
	}
	if arr, ok := v.([]any); ok {
		return arr
	}
	return nil
}

func toString(v any) string {
	if v == nil {
		return ""
	}
	switch t := v.(type) {
	case string:
		return t
	case json.Number:
		return t.String()
	default:
		return ""
	}
}

func toInt64(v any) (int64, bool) {
	switch t := v.(type) {
	case float64:
		return int64(t), true
	case int64:
		return t, true
	case int:
		return int64(t), true
	case json.Number:
		x, err := t.Int64()
		return x, err == nil
	case string:
		x, err := strconv.ParseInt(t, 10, 64)
		return x, err == nil
	default:
		return 0, false
	}
}
