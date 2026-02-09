// server/internal/data/admin_token.go
package data

import (
	"time"

	"server/internal/biz"
	"server/internal/conf"
	jwtutil "server/pkg/jwt"

	"github.com/go-kratos/kratos/v2/log"
)

// NewAdminTokenGenerator 提供 biz.AdminTokenGenerator 给 wire
func NewAdminTokenGenerator(c *conf.Data, logger log.Logger) biz.AdminTokenGenerator {
	l := log.NewHelper(log.With(logger, "module", "data.admin_token"))
	adminCfg := resolveAdminConfig(c)

	if adminCfg.jwtSecret == "" {
		panic("NewAdminTokenGenerator: missing data.auth.jwtSecret (or fallback data.admin_auth.jwtSecret)")
	}

	secret := []byte(adminCfg.jwtSecret)

	exp := 7 * 24 * time.Hour
	if adminCfg.jwtExpireSeconds > 0 {
		exp = time.Duration(adminCfg.jwtExpireSeconds) * time.Second
	}

	cfg := jwtutil.Config{
		Secret:         secret,
		ExpireDuration: exp,
	}

	l.Infof("admin token generator init ok, expire=%s", exp)

	return func(userID int, username string, role int8) (string, time.Time, error) {
		l.Infof("gen admin token uid=%d uname=%s role=%d", userID, username, role)
		return jwtutil.NewToken(cfg, userID, username, role)
	}
}
