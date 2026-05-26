package config

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

type Config struct {
	OzonClientID string
	OzonAPIKey   string
	OzonBaseURL  string
	HTTPAddr     string

	TranslateProvider string
	BaiduTranslateAppID string
	BaiduTranslateKey   string

	MySQLHost          string
	MySQLPort          string
	MySQLAdminUser     string
	MySQLAdminPassword string
	MySQLUser          string
	MySQLPassword      string
	MySQLDB            string
}

func Load() (Config, error) {
	wd, _ := os.Getwd()
	_ = loadDotEnv(filepath.Join(wd, ".env"))

	c := Config{
		OzonClientID: firstNonEmpty(
			os.Getenv("OZON_CLIENT_ID"),
			os.Getenv("client_id"),
			os.Getenv("CLIENT_ID"),
		),
		OzonAPIKey: firstNonEmpty(
			os.Getenv("OZON_API_KEY"),
			os.Getenv("client_secret"),
			os.Getenv("API_KEY"),
			os.Getenv("Api_Key"),
			os.Getenv("Api-Key"),
		),
		OzonBaseURL: firstNonEmpty(
			os.Getenv("OZON_BASE_URL"),
			"https://api-seller.ozon.ru",
		),
		HTTPAddr: firstNonEmpty(
			os.Getenv("HTTP_ADDR"),
			"127.0.0.1:8080",
		),
		TranslateProvider: firstNonEmpty(
			os.Getenv("TRANSLATE_PROVIDER"),
			os.Getenv("translate_provider"),
			"auto",
		),
		BaiduTranslateAppID: firstNonEmpty(
			os.Getenv("BAIDU_TRANSLATE_APP_ID"),
			os.Getenv("baidu_translate_app_id"),
			os.Getenv("BAIDU_APP_ID"),
		),
		BaiduTranslateKey: firstNonEmpty(
			os.Getenv("BAIDU_TRANSLATE_KEY"),
			os.Getenv("baidu_translate_key"),
			os.Getenv("BAIDU_APP_KEY"),
			os.Getenv("BAIDU_KEY"),
		),
		MySQLHost: firstNonEmpty(
			os.Getenv("MYSQL_HOST"),
			os.Getenv("mysql_host"),
		),
		MySQLPort: firstNonEmpty(
			os.Getenv("MYSQL_PORT"),
			os.Getenv("mysql_port"),
			"3306",
		),
		MySQLAdminUser: firstNonEmpty(
			os.Getenv("MYSQL_ADMIN_USER"),
			os.Getenv("mysql_admin_user"),
		),
		MySQLAdminPassword: firstNonEmpty(
			os.Getenv("MYSQL_ADMIN_PASSWORD"),
			os.Getenv("mysql_admin_password"),
		),
		MySQLUser: firstNonEmpty(
			os.Getenv("MYSQL_USER"),
			os.Getenv("mysql_user"),
		),
		MySQLPassword: firstNonEmpty(
			os.Getenv("MYSQL_PASSWORD"),
			os.Getenv("mysql_password"),
		),
		MySQLDB: firstNonEmpty(
			os.Getenv("MYSQL_DB"),
			os.Getenv("mysql_db"),
		),
	}

	c.OzonBaseURL = strings.TrimRight(c.OzonBaseURL, "/")

	if c.OzonClientID == "" || c.OzonAPIKey == "" {
		return Config{}, errors.New("missing ozon credentials: set OZON_CLIENT_ID and OZON_API_KEY (or client_id/client_secret in .env)")
	}

	return c, nil
}

func firstNonEmpty(vals ...string) string {
	for _, v := range vals {
		v = strings.TrimSpace(v)
		if v != "" {
			return v
		}
	}
	return ""
}

func loadDotEnv(path string) error {
	b, err := os.ReadFile(path)
	if err != nil {
		return nil
	}
	baseline := map[string]bool{}
	for _, kv := range os.Environ() {
		k, _, ok := strings.Cut(kv, "=")
		if ok && k != "" {
			baseline[k] = true
		}
	}
	lines := strings.Split(string(b), "\n")
	for _, ln := range lines {
		ln = strings.TrimSpace(ln)
		if ln == "" || strings.HasPrefix(ln, "#") {
			continue
		}
		k, v, ok := strings.Cut(ln, "=")
		if !ok {
			continue
		}
		k = strings.TrimSpace(k)
		v = strings.TrimSpace(v)
		if k == "" {
			continue
		}
		if baseline[k] {
			continue
		}
		if err := os.Setenv(k, v); err != nil {
			return fmt.Errorf("setenv %s: %w", k, err)
		}
	}
	return nil
}
