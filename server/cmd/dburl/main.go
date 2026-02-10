package main

import (
	"flag"
	"fmt"
	"net/url"
	"os"
	"strings"

	"github.com/go-sql-driver/mysql"
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

	raw, err := os.ReadFile(*confPath)
	if err != nil {
		fail("read config failed: %v", err)
	}

	var cfg bootstrapConfig
	if err := yaml.Unmarshal(raw, &cfg); err != nil {
		fail("parse config failed: %v", err)
	}

	dsn := strings.TrimSpace(cfg.Data.Mysql.DSN)
	if dsn == "" {
		fail("mysql dsn is empty in %s", *confPath)
	}

	parsed, err := mysql.ParseDSN(dsn)
	if err != nil {
		fail("parse mysql dsn failed: %v", err)
	}

	dbName := parsed.DBName
	if dbName == "" {
		fail("mysql dsn missing db name")
	}

	values := url.Values{}
	for key, value := range parsed.Params {
		values.Set(key, value)
	}
	if parsed.ParseTime {
		values.Set("parseTime", "true")
	}
	if parsed.Loc != nil {
		values.Set("loc", parsed.Loc.String())
	}
	if parsed.Timeout > 0 {
		values.Set("timeout", parsed.Timeout.String())
	}
	if parsed.ReadTimeout > 0 {
		values.Set("readTimeout", parsed.ReadTimeout.String())
	}
	if parsed.WriteTimeout > 0 {
		values.Set("writeTimeout", parsed.WriteTimeout.String())
	}

	u := &url.URL{
		Scheme:   "mysql",
		User:     url.UserPassword(parsed.User, parsed.Passwd),
		Host:     parsed.Addr,
		Path:     "/" + dbName,
		RawQuery: values.Encode(),
	}
	fmt.Print(u.String())
}

func fail(format string, args ...any) {
	fmt.Fprintf(os.Stderr, format+"\n", args...)
	os.Exit(1)
}
