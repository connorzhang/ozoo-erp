package store

import (
	"context"
	"database/sql"
	"fmt"
	"sort"
	"strings"
)

type CategoryRow struct {
	ID            int64
	ParentID      *int64
	Depth         int
	NameEN        string
	NameRU        string
	NameZH        string
	ChildrenCount int
	TypeID        *int64
}

type CategoryStore struct {
	db *sql.DB
}

func NewCategoryStore(db *sql.DB) *CategoryStore {
	return &CategoryStore{db: db}
}

func (s *CategoryStore) Migrate(ctx context.Context) error {
	stmts := []string{
		`CREATE TABLE IF NOT EXISTS category_dict (
			id BIGINT NOT NULL,
			parent_id BIGINT NULL,
			depth INT NOT NULL,
			name_en VARCHAR(255) NOT NULL DEFAULT '',
			name_ru VARCHAR(255) NOT NULL DEFAULT '',
			name_zh VARCHAR(255) NOT NULL DEFAULT '',
			children_count INT NOT NULL DEFAULT 0,
			type_id BIGINT NULL,
			updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
			PRIMARY KEY (id),
			KEY idx_category_dict_parent (parent_id)
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
	}
	for _, stmt := range stmts {
		if _, err := s.db.ExecContext(ctx, stmt); err != nil {
			return err
		}
	}
	return nil
}

func (s *CategoryStore) Upsert(ctx context.Context, rows []CategoryRow) error {
	if len(rows) == 0 {
		return nil
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	stmt, err := tx.PrepareContext(ctx, `
		INSERT INTO category_dict
			(id, parent_id, depth, name_en, name_ru, children_count, type_id)
		VALUES
			(?, ?, ?, ?, ?, ?, ?)
		ON DUPLICATE KEY UPDATE
			parent_id = VALUES(parent_id),
			depth = VALUES(depth),
			name_en = VALUES(name_en),
			name_ru = VALUES(name_ru),
			children_count = VALUES(children_count),
			type_id = VALUES(type_id)
	`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	for _, r := range rows {
		var parent any = nil
		if r.ParentID != nil {
			parent = *r.ParentID
		}
		var typeID any = nil
		if r.TypeID != nil {
			typeID = *r.TypeID
		}
		if _, err := stmt.ExecContext(ctx, r.ID, parent, r.Depth, r.NameEN, r.NameRU, r.ChildrenCount, typeID); err != nil {
			return err
		}
	}

	return tx.Commit()
}

type CascaderNode struct {
	Value    int64          `json:"value"`
	Label    string         `json:"label"`
	LabelEN  string         `json:"label_en,omitempty"`
	LabelZH  string         `json:"label_zh,omitempty"`
	Children []*CascaderNode `json:"children,omitempty"`
}

func (s *CategoryStore) CascaderTree(ctx context.Context) ([]*CascaderNode, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, parent_id, depth, name_en, name_ru, name_zh, children_count
		FROM category_dict
		ORDER BY depth ASC, id ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	type rec struct {
		id            int64
		parentID      *int64
		depth         int
		en            string
		ru            string
		zh            string
		childrenCount int
	}

	var all []rec
	for rows.Next() {
		var r rec
		var parent sql.NullInt64
		if err := rows.Scan(&r.id, &parent, &r.depth, &r.en, &r.ru, &r.zh, &r.childrenCount); err != nil {
			return nil, err
		}
		if parent.Valid {
			v := parent.Int64
			r.parentID = &v
		}
		all = append(all, r)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	nodes := make(map[int64]*CascaderNode, len(all))
	childrenMap := map[int64][]*CascaderNode{}
	var roots []*CascaderNode

	for _, r := range all {
		label, labelEN, labelZH := formatCategoryLabel(r.zh, r.en, r.ru)
		n := &CascaderNode{Value: r.id, Label: label, LabelEN: labelEN, LabelZH: labelZH}
		nodes[r.id] = n
		if r.parentID == nil {
			roots = append(roots, n)
		} else {
			childrenMap[*r.parentID] = append(childrenMap[*r.parentID], n)
		}
	}

	for pid, kids := range childrenMap {
		sort.Slice(kids, func(i, j int) bool { return kids[i].Label < kids[j].Label })
		if p := nodes[pid]; p != nil {
			p.Children = kids
		}
	}

	sort.Slice(roots, func(i, j int) bool { return roots[i].Label < roots[j].Label })
	return roots, nil
}

func formatCategoryLabel(zh, en, ru string) (label, labelEN, labelZH string) {
	labelEN = en
	labelZH = zh
	base := firstNonEmpty(zh, en, ru)
	sec := ""
	if base == zh {
		sec = firstNonEmpty(en, ru)
	} else if base == en {
		sec = firstNonEmpty(zh, ru)
	} else {
		sec = firstNonEmpty(zh, en)
	}
	if stringsTrim(sec) != "" && stringsTrim(sec) != stringsTrim(base) {
		return fmt.Sprintf("%s / %s", base, sec), labelEN, labelZH
	}
	return base, labelEN, labelZH
}

func firstNonEmpty(vals ...string) string {
	for _, v := range vals {
		if stringsTrim(v) != "" {
			return v
		}
	}
	return ""
}

func stringsTrim(s string) string {
	return strings.TrimSpace(s)
}
