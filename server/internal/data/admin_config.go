package data

import "server/internal/conf"

type resolvedAdminConfig struct {
	jwtSecret        string
	jwtExpireSeconds int32
	username         string
	password         string
}

// 统一解析管理员配置：优先 data.auth，缺失时兼容回退到 data.admin_auth。
func resolveAdminConfig(c *conf.Data) resolvedAdminConfig {
	cfg := resolvedAdminConfig{}
	if c == nil {
		return cfg
	}

	if c.Auth != nil {
		cfg.jwtSecret = c.Auth.JwtSecret
		cfg.jwtExpireSeconds = c.Auth.JwtExpireSeconds
		if c.Auth.Admin != nil {
			cfg.username = c.Auth.Admin.Username
			cfg.password = c.Auth.Admin.Password
		}
	}

	if c.AdminAuth != nil {
		if cfg.jwtSecret == "" && c.AdminAuth.JwtSecret != "" {
			cfg.jwtSecret = c.AdminAuth.JwtSecret
		}
		if cfg.jwtExpireSeconds <= 0 && c.AdminAuth.JwtExpireSeconds > 0 {
			cfg.jwtExpireSeconds = c.AdminAuth.JwtExpireSeconds
		}
		if c.AdminAuth.Admin != nil {
			if cfg.username == "" {
				cfg.username = c.AdminAuth.Admin.Username
			}
			if cfg.password == "" {
				cfg.password = c.AdminAuth.Admin.Password
			}
		}
	}

	return cfg
}
