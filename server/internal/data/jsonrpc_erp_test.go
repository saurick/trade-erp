package data

import (
	"context"
	"io"
	"sync"
	"testing"
	"time"

	"server/internal/biz"

	"github.com/go-kratos/kratos/v2/log"
	tracesdk "go.opentelemetry.io/otel/sdk/trace"
	"google.golang.org/protobuf/types/known/structpb"
)

type memERPRepoForData struct {
	mu      sync.Mutex
	nextID  int
	records map[string][]*biz.ERPRecord
}

func newMemERPRepoForData() *memERPRepoForData {
	return &memERPRepoForData{
		nextID:  1,
		records: map[string][]*biz.ERPRecord{},
	}
}

func (r *memERPRepoForData) ListByModule(ctx context.Context, moduleKey string) ([]*biz.ERPRecord, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	items := r.records[moduleKey]
	out := make([]*biz.ERPRecord, 0, len(items))
	for _, item := range items {
		copyItem := *item
		copyItem.Payload = cloneMapAny(item.Payload)
		out = append(out, &copyItem)
	}
	return out, nil
}

func (r *memERPRepoForData) Create(ctx context.Context, moduleKey string, payload map[string]any, createdByAdminID int) (*biz.ERPRecord, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	now := time.Now()
	code, _ := payload["code"].(string)
	box, _ := payload["box"].(string)
	item := &biz.ERPRecord{
		ID:        r.nextID,
		ModuleKey: moduleKey,
		Code:      code,
		Box:       box,
		Payload:   cloneMapAny(payload),
		CreatedAt: now,
		UpdatedAt: now,
	}
	if createdByAdminID > 0 {
		item.CreatedByAdminID = &createdByAdminID
		item.UpdatedByAdminID = &createdByAdminID
	}
	r.nextID++
	r.records[moduleKey] = append([]*biz.ERPRecord{item}, r.records[moduleKey]...)

	copyItem := *item
	copyItem.Payload = cloneMapAny(item.Payload)
	return &copyItem, nil
}

func (r *memERPRepoForData) Update(ctx context.Context, moduleKey string, id int, payload map[string]any, updatedByAdminID int) (*biz.ERPRecord, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	items := r.records[moduleKey]
	for index, item := range items {
		if item.ID != id {
			continue
		}
		code, _ := payload["code"].(string)
		box, _ := payload["box"].(string)
		item.Code = code
		item.Box = box
		item.Payload = cloneMapAny(payload)
		item.UpdatedAt = time.Now()
		if updatedByAdminID > 0 {
			item.UpdatedByAdminID = &updatedByAdminID
		}
		items[index] = item
		copyItem := *item
		copyItem.Payload = cloneMapAny(item.Payload)
		return &copyItem, nil
	}
	return nil, biz.ErrERPRecordNotFound
}

func (r *memERPRepoForData) Delete(ctx context.Context, moduleKey string, id int) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	items := r.records[moduleKey]
	for index, item := range items {
		if item.ID != id {
			continue
		}
		r.records[moduleKey] = append(items[:index], items[index+1:]...)
		return nil
	}
	return biz.ErrERPRecordNotFound
}

func TestJsonrpcData_HandleERP_CRUD(t *testing.T) {
	logger := log.NewStdLogger(io.Discard)
	repo := newMemERPRepoForData()
	erpUC := biz.NewERPUsecase(repo, logger, tracesdk.NewTracerProvider())

	j := &JsonrpcData{
		log:   log.NewHelper(log.With(logger, "module", "data.jsonrpc.erp.test")),
		erpUC: erpUC,
	}

	ctx := biz.NewContextWithClaims(context.Background(), &biz.AuthClaims{
		UserID:   1,
		Username: "admin",
		Role:     biz.RoleAdmin,
	})

	createParams, _ := structpb.NewStruct(map[string]any{
		"module_key": "partners",
		"record": map[string]any{
			"code":             "CS-001",
			"partnerType":      "合作客户",
			"name":             "客户A",
			"address":          "浙江杭州",
			"contact":          "张三",
			"contactPhone":     "13800001111",
			"paymentCycleDays": 30,
			"box":              "草稿箱",
		},
	})
	_, createRes, err := j.handleERP(ctx, "create", "1", createParams)
	if err != nil {
		t.Fatalf("create err: %v", err)
	}
	if createRes == nil || createRes.Code != 0 {
		t.Fatalf("create result invalid: %+v", createRes)
	}

	listParams, _ := structpb.NewStruct(map[string]any{
		"module_key": "partners",
	})
	_, listRes, err := j.handleERP(ctx, "list", "2", listParams)
	if err != nil {
		t.Fatalf("list err: %v", err)
	}
	if listRes == nil || listRes.Code != 0 {
		t.Fatalf("list result invalid: %+v", listRes)
	}
	records, ok := listRes.GetData().AsMap()["records"].([]any)
	if !ok || len(records) != 1 {
		t.Fatalf("records should contain 1 item, got=%v", listRes.GetData().AsMap()["records"])
	}
}

func cloneMapAny(input map[string]any) map[string]any {
	out := make(map[string]any, len(input))
	for key, value := range input {
		out[key] = value
	}
	return out
}
