package app

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"ozon-erp/internal/config"
	"ozon-erp/internal/ozon"
	"ozon-erp/internal/pricing"
	"ozon-erp/internal/store"
)

type Server struct {
	cfg        config.Config
	ozon       *ozon.Client
	pricingSvc *pricing.Service
	catStore   *store.CategoryStore
	mux        *http.ServeMux
}

func NewServer(cfg config.Config) (*Server, error) {
	if cfg.HTTPAddr == "" {
		return nil, errors.New("missing http addr")
	}
	oc := ozon.New(ozon.Options{
		BaseURL:  cfg.OzonBaseURL,
		ClientID: cfg.OzonClientID,
		APIKey:   cfg.OzonAPIKey,
		Timeout:  45 * time.Second,
	})

	s := &Server{
		cfg:        cfg,
		ozon:       oc,
		pricingSvc: pricing.NewService(),
		mux:        http.NewServeMux(),
	}

	if cfg.MySQLHost != "" && cfg.MySQLDB != "" && cfg.MySQLUser != "" {
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()
		opt := store.MySQLOptions{
			Host:          cfg.MySQLHost,
			Port:          cfg.MySQLPort,
			AdminUser:     cfg.MySQLAdminUser,
			AdminPassword: cfg.MySQLAdminPassword,
			User:          cfg.MySQLUser,
			Password:      cfg.MySQLPassword,
			DB:            cfg.MySQLDB,
		}
		if err := store.EnsureDatabaseAndUser(ctx, opt); err != nil {
			return nil, err
		}
		db, err := store.OpenDB(ctx, opt)
		if err != nil {
			return nil, err
		}
		cs := store.NewCategoryStore(db)
		if err := cs.Migrate(ctx); err != nil {
			return nil, err
		}
		s.catStore = cs
	}

	s.routes()
	return s, nil
}

func (s *Server) Handler() http.Handler {
	return s.mux
}

func (s *Server) routes() {
	s.mux.HandleFunc("GET /health", s.handleHealth)
	s.mux.HandleFunc("POST /tools/translate", s.handleTranslate)
	s.mux.HandleFunc("POST /dict/categories/sync", s.handleDictCategorySync)
	s.mux.HandleFunc("GET /dict/categories/cascader", s.handleDictCategoryCascader)

	s.mux.HandleFunc("POST /api/selection/import-excel", s.handleImportExcel)

	s.mux.HandleFunc("GET /ozon/roles", s.handleOzonRoles)
	s.mux.HandleFunc("GET /ozon/status", s.handleOzonStatus)
	s.mux.HandleFunc("GET /ozon/seller", s.handleOzonSeller)
	s.mux.HandleFunc("GET /ozon/categories/tree", s.handleOzonCategoryTree)
	s.mux.HandleFunc("POST /ozon/products/list", s.handleOzonProductList)
	s.mux.HandleFunc("GET /ozon/notification/list", s.handleOzonNotificationList)

	s.mux.HandleFunc("POST /ozon/categories/attribute", s.proxyPost("/v1/description-category/attribute", 60*time.Second))
	s.mux.HandleFunc("POST /ozon/categories/attribute/values", s.proxyPost("/v1/description-category/attribute/values", 60*time.Second))
	s.mux.HandleFunc("POST /ozon/categories/attribute/values/search", s.proxyPost("/v1/description-category/attribute/values/search", 60*time.Second))
	s.mux.HandleFunc("POST /ozon/categories/tips", s.proxyPost("/v1/description-category/tips", 60*time.Second))

	s.mux.HandleFunc("POST /ozon/products/info/list", s.proxyPost("/v3/product/info/list", 60*time.Second))
	s.mux.HandleFunc("POST /ozon/products/import", s.proxyPost("/v3/product/import", 90*time.Second))
	s.mux.HandleFunc("POST /ozon/products/import/info", s.proxyPost("/v1/product/import/info", 60*time.Second))
	s.mux.HandleFunc("POST /ozon/products/pictures/import", s.proxyPost("/v1/product/pictures/import", 90*time.Second))
	s.mux.HandleFunc("POST /ozon/products/pictures/info", s.proxyPost("/v2/product/pictures/info", 60*time.Second))
	s.mux.HandleFunc("POST /ozon/products/prices/import", s.proxyPost("/v1/product/import/prices", 60*time.Second))
	s.mux.HandleFunc("POST /ozon/products/stocks", s.proxyPost("/v2/products/stocks", 60*time.Second))

	s.mux.HandleFunc("POST /ozon/search-queries/top", s.proxyPost("/v1/search-queries/top", 60*time.Second))
	s.mux.HandleFunc("POST /ozon/search-queries/text", s.proxyPost("/v1/search-queries/text", 60*time.Second))
	s.mux.HandleFunc("POST /ozon/analytics/product-queries", s.proxyPost("/v1/analytics/product-queries", 60*time.Second))
	s.mux.HandleFunc("POST /ozon/analytics/product-queries/details", s.proxyPost("/v1/analytics/product-queries/details", 60*time.Second))
	s.mux.HandleFunc("POST /ozon/analytics/data", s.proxyPost("/v1/analytics/data", 60*time.Second))
	s.mux.HandleFunc("POST /ozon/analytics/stocks", s.proxyPost("/v1/analytics/stocks", 60*time.Second))

	s.mux.HandleFunc("POST /ozon/posting/fbs/list", s.proxyPost("/v3/posting/fbs/list", 60*time.Second))
	s.mux.HandleFunc("POST /ozon/posting/fbs/get", s.proxyPost("/v3/posting/fbs/get", 60*time.Second))
	s.mux.HandleFunc("POST /ozon/posting/fbs/unfulfilled/list", s.proxyPost("/v4/posting/fbs/unfulfilled/list", 60*time.Second))
	s.mux.HandleFunc("POST /ozon/posting/fbs/ship", s.proxyPost("/v4/posting/fbs/ship", 60*time.Second))
	s.mux.HandleFunc("POST /ozon/posting/fbs/tracking-number/set", s.proxyPost("/v2/fbs/posting/tracking-number/set", 60*time.Second))
	s.mux.HandleFunc("POST /ozon/posting/fbs/delivering", s.proxyPost("/v2/fbs/posting/delivering", 60*time.Second))
	s.mux.HandleFunc("POST /ozon/posting/fbs/delivered", s.proxyPost("/v2/fbs/posting/delivered", 60*time.Second))
	s.mux.HandleFunc("POST /ozon/posting/fbo/list", s.proxyPost("/v3/posting/fbo/list", 60*time.Second))
	s.mux.HandleFunc("POST /ozon/posting/fbp/list", s.proxyPost("/v1/posting/fbp/list", 60*time.Second))

	s.mux.HandleFunc("POST /ozon/returns/rfbs/list", s.proxyPost("/v2/returns/rfbs/list", 60*time.Second))
	s.mux.HandleFunc("POST /ozon/returns/rfbs/get", s.proxyPost("/v2/returns/rfbs/get", 60*time.Second))
	s.mux.HandleFunc("POST /ozon/returns/rfbs/reject", s.proxyPost("/v2/returns/rfbs/reject", 60*time.Second))
	s.mux.HandleFunc("POST /ozon/returns/rfbs/receive-return", s.proxyPost("/v2/returns/rfbs/receive-return", 60*time.Second))
	s.mux.HandleFunc("POST /ozon/returns/rfbs/return-money", s.proxyPost("/v2/returns/rfbs/return-money", 60*time.Second))
	s.mux.HandleFunc("POST /ozon/returns/company/fbs/info", s.proxyPost("/v1/returns/company/fbs/info", 60*time.Second))

	s.mux.HandleFunc("POST /ozon/finance/transaction/list", s.proxyPost("/v3/finance/transaction/list", 60*time.Second))
	s.mux.HandleFunc("POST /ozon/finance/transaction/totals", s.proxyPost("/v3/finance/transaction/totals", 60*time.Second))
	s.mux.HandleFunc("POST /ozon/finance/balance", s.proxyPost("/v1/finance/balance", 60*time.Second))
	s.mux.HandleFunc("POST /ozon/finance/cash-flow-statement/list", s.proxyPost("/v1/finance/cash-flow-statement/list", 60*time.Second))

	s.mux.HandleFunc("POST /pricing/calc", s.handlePricingCalc)

	if h, err := newSPAHandler("web/dist"); err == nil {
		s.mux.Handle("GET /{path...}", h)
	}
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (s *Server) handleOzonRoles(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	var out any
	status, raw, err := s.ozon.PostJSON(ctx, "/v1/roles", map[string]any{}, &out)
	if err != nil {
		writeJSON(w, statusOr(status, err), map[string]any{"error": err.Error(), "raw": string(raw)})
		return
	}
	writeRawJSON(w, http.StatusOK, raw)
}

func (s *Server) handleOzonStatus(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	var out ozon.RolesResponse
	status, raw, err := s.ozon.PostJSON(ctx, "/v1/roles", map[string]any{}, &out)
	if err != nil {
		writeJSON(w, statusOr(status, err), map[string]any{"error": err.Error(), "raw": string(raw)})
		return
	}

	methodCount := 0
	roleNames := make([]string, 0, len(out.Roles))
	for _, r := range out.Roles {
		roleNames = append(roleNames, r.Name)
		methodCount += len(r.Methods)
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"ok":           true,
		"expires_at":   out.ExpiresAt,
		"roles":        roleNames,
		"method_count": methodCount,
	})
}

func (s *Server) handleOzonSeller(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 45*time.Second)
	defer cancel()

	var out any
	status, raw, err := s.ozon.PostJSON(ctx, "/v1/seller/info", map[string]any{}, &out)
	if err != nil {
		writeJSON(w, statusOr(status, err), map[string]any{"error": err.Error(), "raw": string(raw)})
		return
	}
	writeRawJSON(w, http.StatusOK, raw)
}

func (s *Server) handleOzonCategoryTree(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 60*time.Second)
	defer cancel()

	lang := r.URL.Query().Get("language")
	if lang == "" {
		lang = r.URL.Query().Get("lang")
	}
	if lang == "" {
		lang = "RU"
	}

	var out any
	status, raw, err := s.ozon.PostJSON(ctx, "/v1/description-category/tree", map[string]any{"language": lang}, &out)
	if err != nil {
		writeJSON(w, statusOr(status, err), map[string]any{"error": err.Error(), "raw": string(raw)})
		return
	}
	writeRawJSON(w, http.StatusOK, raw)
}

func (s *Server) handleOzonProductList(w http.ResponseWriter, r *http.Request) {
	var req any
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "invalid json"})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 45*time.Second)
	defer cancel()

	var out any
	status, raw, err := s.ozon.PostJSON(ctx, "/v3/product/list", req, &out)
	if err != nil {
		writeJSON(w, statusOr(status, err), map[string]any{"error": err.Error(), "raw": string(raw)})
		return
	}
	writeRawJSON(w, http.StatusOK, raw)
}

func (s *Server) handleOzonNotificationList(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	var out any
	status, raw, err := s.ozon.PostJSON(ctx, "/v1/notification/list", map[string]any{}, &out)
	if err != nil {
		writeJSON(w, statusOr(status, err), map[string]any{"error": err.Error(), "raw": string(raw)})
		return
	}
	writeRawJSON(w, http.StatusOK, raw)
}

func (s *Server) handlePricingCalc(w http.ResponseWriter, r *http.Request) {
	var req pricing.CalcRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "invalid json"})
		return
	}
	resp := s.pricingSvc.Calc(req)
	writeJSON(w, http.StatusOK, resp)
}

func (s *Server) proxyPost(path string, timeout time.Duration) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req any
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]any{"error": "invalid json"})
			return
		}

		ctx, cancel := context.WithTimeout(r.Context(), timeout)
		defer cancel()

		var out any
		status, raw, err := s.ozon.PostJSON(ctx, path, req, &out)
		if err != nil {
			writeJSON(w, statusOr(status, err), map[string]any{"error": err.Error(), "raw": string(raw)})
			return
		}
		writeRawJSON(w, http.StatusOK, raw)
	}
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeRawJSON(w http.ResponseWriter, status int, raw []byte) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_, _ = w.Write(raw)
}

func statusOr(status int, err error) int {
	if status > 0 {
		return status
	}
	return http.StatusBadGateway
}
