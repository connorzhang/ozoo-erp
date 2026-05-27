package store

import (
	"context"
	"database/sql"
	"fmt"
	"regexp"
	"strings"
	"time"

	_ "github.com/go-sql-driver/mysql"
)

type MySQLOptions struct {
	Host          string
	Port          string
	AdminUser     string
	AdminPassword string
	User          string
	Password      string
	DB            string
}

func EnsureDatabaseAndUser(ctx context.Context, opt MySQLOptions) error {
	if opt.Host == "" || opt.DB == "" || opt.User == "" {
		return fmt.Errorf("mysql not configured")
	}
	if opt.AdminUser == "" {
		return fmt.Errorf("mysql admin not configured")
	}
	if !isSafeIdent(opt.DB) {
		return fmt.Errorf("invalid mysql db name")
	}
	if !isSafeIdent(opt.User) {
		return fmt.Errorf("invalid mysql user name")
	}

	adminDSN := fmt.Sprintf("%s:%s@tcp(%s:%s)/?parseTime=true&multiStatements=true&charset=utf8mb4&collation=utf8mb4_unicode_ci",
		opt.AdminUser, opt.AdminPassword, opt.Host, opt.Port,
	)
	db, err := sql.Open("mysql", adminDSN)
	if err != nil {
		return err
	}
	defer db.Close()

	db.SetConnMaxLifetime(5 * time.Minute)
	db.SetMaxOpenConns(5)
	db.SetMaxIdleConns(2)

	cctx, cancel := context.WithTimeout(ctx, 20*time.Second)
	defer cancel()
	if err := db.PingContext(cctx); err != nil {
		return err
	}

	if _, err := db.ExecContext(cctx, "CREATE DATABASE IF NOT EXISTS "+opt.DB+" CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"); err != nil {
		return err
	}

	userLit := sqlStringLiteral(opt.User)
	passLit := sqlStringLiteral(opt.Password)

	for _, host := range []string{"%", "localhost"} {
		hostLit := sqlStringLiteral(host)
		// For MySQL 5.5 compatibility, use GRANT to create user
		if _, err := db.ExecContext(cctx, "GRANT ALL PRIVILEGES ON "+opt.DB+".* TO "+userLit+"@"+hostLit+" IDENTIFIED BY "+passLit); err != nil {
			return err
		}
	}

	if _, err := db.ExecContext(cctx, "FLUSH PRIVILEGES"); err != nil {
		return err
	}
	return nil
}

func OpenDB(ctx context.Context, opt MySQLOptions) (*sql.DB, error) {
	if opt.Host == "" || opt.DB == "" || opt.User == "" {
		return nil, fmt.Errorf("mysql not configured")
	}
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?parseTime=true&charset=utf8mb4&collation=utf8mb4_unicode_ci",
		opt.User, opt.Password, opt.Host, opt.Port, opt.DB,
	)
	db, err := sql.Open("mysql", dsn)
	if err != nil {
		return nil, err
	}

	db.SetConnMaxLifetime(30 * time.Minute)
	db.SetMaxOpenConns(10)
	db.SetMaxIdleConns(5)

	cctx, cancel := context.WithTimeout(ctx, 15*time.Second)
	defer cancel()
	if err := db.PingContext(cctx); err != nil {
		_ = db.Close()
		return nil, err
	}
	return db, nil
}

func sqlStringLiteral(s string) string {
	return "'" + strings.ReplaceAll(s, "'", "''") + "'"
}

var safeIdentRe = regexp.MustCompile(`^[a-zA-Z0-9_]+$`)

func isSafeIdent(s string) bool {
	return safeIdentRe.MatchString(s)
}
