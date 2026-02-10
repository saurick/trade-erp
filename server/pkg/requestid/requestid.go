package requestid

import (
	"context"
	"crypto/rand"
	"encoding/hex"

	"github.com/go-kratos/kratos/v2/log"
)

type ctxKeyRequestID struct{}

func New() string {
	b := make([]byte, 12)
	if _, err := rand.Read(b); err != nil {
		return "rid-fallback"
	}
	return hex.EncodeToString(b)
}

func NewContext(ctx context.Context, requestID string) context.Context {
	return context.WithValue(ctx, ctxKeyRequestID{}, requestID)
}

func FromContext(ctx context.Context) string {
	v, ok := ctx.Value(ctxKeyRequestID{}).(string)
	if !ok {
		return ""
	}
	return v
}

func Valuer() log.Valuer {
	return func(ctx context.Context) interface{} {
		return FromContext(ctx)
	}
}
