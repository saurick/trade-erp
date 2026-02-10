package main

import (
	"database/sql"
	"flag"
	"fmt"
	"os"
	"strings"

	"github.com/go-sql-driver/mysql"
	_ "github.com/go-sql-driver/mysql"
	"gopkg.in/yaml.v3"
)

type bootstrapConfig struct {
	Data struct {
		Mysql struct {
			DSN string `yaml:"dsn"`
		} `yaml:"mysql"`
	} `yaml:"data"`
}

func main() {
	confPath := flag.String("conf", "./configs/dev/config.yaml", "config yaml path")
	flag.Parse()

	dsn, dbName := loadDSN(*confPath)

	db, err := sql.Open("mysql", dsn)
	if err != nil {
		fail("open mysql failed: %v", err)
	}
	defer db.Close()

	required := map[string][]string{
		"users": {
			"username",
			"password_hash",
			"role",
			"admin_id",
			"disabled",
			"last_login_at",
			"points",
			"expires_at",
			"created_at",
			"updated_at",
		},
		"admin_users": {
			"id",
			"username",
			"password_hash",
			"level",
			"menu_permissions",
			"parent_id",
			"disabled",
			"last_login_at",
			"created_at",
			"updated_at",
		},
		"erp_module_records": {
			"id",
			"module_key",
			"code",
			"box",
			"payload",
			"created_by_admin_id",
			"updated_by_admin_id",
			"created_at",
			"updated_at",
		},
	}

	for table, cols := range required {
		for _, col := range cols {
			ok, err := columnExists(db, dbName, table, col)
			if err != nil {
				fail("check column failed table=%s column=%s err=%v", table, col, err)
			}
			if !ok {
				fail("missing column: %s.%s", table, col)
			}
		}
	}

	fmt.Println("schema check passed")
}

func loadDSN(confPath string) (string, string) {
	raw, err := os.ReadFile(confPath)
	if err != nil {
		fail("read config failed: %v", err)
	}

	var cfg bootstrapConfig
	if err := yaml.Unmarshal(raw, &cfg); err != nil {
		fail("parse config failed: %v", err)
	}

	dsn := strings.TrimSpace(cfg.Data.Mysql.DSN)
	if dsn == "" {
		fail("mysql dsn is empty in %s", confPath)
	}

	parsed, err := mysql.ParseDSN(dsn)
	if err != nil {
		fail("parse mysql dsn failed: %v", err)
	}
	if parsed.DBName == "" {
		fail("mysql dsn missing db name")
	}

	return dsn, parsed.DBName
}

func columnExists(db *sql.DB, dbName, tableName, columnName string) (bool, error) {
	var count int
	err := db.QueryRow(
		`SELECT COUNT(1) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
		dbName,
		tableName,
		columnName,
	).Scan(&count)
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

func fail(format string, args ...any) {
	fmt.Fprintf(os.Stderr, format+"\n", args...)
	os.Exit(1)
}
