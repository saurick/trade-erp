// server/internal/service/jsonrpc.go
package service

import (
	"context"
	"strings"
	"time"

	v1 "server/api/jsonrpc/v1"
	"server/internal/biz"
	"server/pkg/requestid"

	"github.com/go-kratos/kratos/v2/log"
	"github.com/go-kratos/kratos/v2/transport"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
)

// JsonrpcService 实现 v1.JsonrpcServer 接口。
type JsonrpcService struct {
	v1.UnimplementedJsonrpcServer

	uc  *biz.JsonrpcUsecase
	log *log.Helper
}

func NewJsonrpcService(uc *biz.JsonrpcUsecase, logger log.Logger) *JsonrpcService {
	return &JsonrpcService{
		uc:  uc,
		log: log.NewHelper(logger),
	}
}

// GetJsonrpc 对应 GET /rpc/{url}
func (s *JsonrpcService) GetJsonrpc(ctx context.Context, req *v1.GetJsonrpcRequest) (*v1.GetJsonrpcReply, error) {
	ctx = injectRequestID(ctx)
	ctx, span := otel.Tracer("service.jsonrpc").Start(ctx, "jsonrpc.get")
	span.SetAttributes(
		attribute.String("jsonrpc.url", req.GetUrl()),
		attribute.String("jsonrpc.method", req.GetMethod()),
	)
	defer span.End()

	start := time.Now()
	defer func() {
		s.log.WithContext(ctx).Infof(
			"GetJsonrpc: done url=%s method=%s id=%s cost=%s",
			req.GetUrl(), req.GetMethod(), req.GetId(), time.Since(start),
		)
	}()

	s.log.WithContext(ctx).Infof(
		"GetJsonrpc: url=%s jsonrpc=%s method=%s id=%s",
		req.GetUrl(), req.GetJsonrpc(), req.GetMethod(), req.GetId(),
	)

	id, result, bizErr := s.uc.Handle(
		ctx,
		req.GetUrl(),
		req.GetJsonrpc(),
		req.GetMethod(),
		req.GetId(),
		req.GetParams(),
	)

	reply := &v1.GetJsonrpcReply{
		Jsonrpc: "2.0",
		Id:      id,
		Result:  result,
	}

	if bizErr != nil {
		reply.Error = bizErr.Error()
	}

	return reply, nil
}

// PostJsonrpc 对应 POST /rpc/{url}
func (s *JsonrpcService) PostJsonrpc(ctx context.Context, req *v1.PostJsonrpcRequest) (*v1.PostJsonrpcReply, error) {
	ctx = injectRequestID(ctx)
	ctx, span := otel.Tracer("service.jsonrpc").Start(ctx, "jsonrpc.post")
	span.SetAttributes(
		attribute.String("jsonrpc.url", req.GetUrl()),
		attribute.String("jsonrpc.method", req.GetMethod()),
	)
	defer span.End()

	start := time.Now()
	defer func() {
		s.log.WithContext(ctx).Infof(
			"PostJsonrpc: done url=%s method=%s id=%s cost=%s",
			req.GetUrl(), req.GetMethod(), req.GetId(), time.Since(start),
		)
	}()

	s.log.WithContext(ctx).Infof(
		"PostJsonrpc: url=%s jsonrpc=%s method=%s id=%s",
		req.GetUrl(), req.GetJsonrpc(), req.GetMethod(), req.GetId(),
	)

	id, result, bizErr := s.uc.Handle(
		ctx,
		req.GetUrl(),
		req.GetJsonrpc(),
		req.GetMethod(),
		req.GetId(),
		req.GetParams(),
	)

	reply := &v1.PostJsonrpcReply{
		Jsonrpc: "2.0",
		Id:      id,
		Result:  result,
	}

	if bizErr != nil {
		reply.Error = bizErr.Error()
	}

	return reply, nil
}

func injectRequestID(ctx context.Context) context.Context {
	if requestid.FromContext(ctx) != "" {
		return ctx
	}

	reqID := ""
	if tr, ok := transport.FromServerContext(ctx); ok && tr != nil {
		reqID = strings.TrimSpace(tr.RequestHeader().Get("X-Request-ID"))
		if reqID == "" {
			reqID = strings.TrimSpace(tr.RequestHeader().Get("X-Request-Id"))
		}
		if reqID == "" {
			reqID = requestid.New()
		}
		tr.ReplyHeader().Set("X-Request-ID", reqID)
	}
	if reqID == "" {
		reqID = requestid.New()
	}
	return requestid.NewContext(ctx, reqID)
}
