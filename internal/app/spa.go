package app

import (
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

type spaHandler struct {
	distDir string
	index   []byte
}

func newSPAHandler(distDir string) (*spaHandler, error) {
	distDir = filepath.Clean(distDir)
	idxPath := filepath.Join(distDir, "index.html")
	b, err := os.ReadFile(idxPath)
	if err != nil {
		return nil, err
	}
	return &spaHandler{distDir: distDir, index: b}, nil
}

func (h *spaHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet && r.Method != http.MethodHead {
		http.NotFound(w, r)
		return
	}

	p := r.URL.Path
	if p == "" {
		p = "/"
	}

	if strings.HasPrefix(p, "/ozon") || p == "/health" {
		http.NotFound(w, r)
		return
	}
	if strings.HasPrefix(p, "/pricing/") || p == "/pricing/calc" {
		http.NotFound(w, r)
		return
	}

	fp := filepath.Join(h.distDir, filepath.FromSlash(strings.TrimPrefix(p, "/")))
	if st, err := os.Stat(fp); err == nil && !st.IsDir() {
		http.ServeFile(w, r, fp)
		return
	}

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	_, _ = w.Write(h.index)
}

