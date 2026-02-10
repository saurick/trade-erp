package biz

import (
	"context"
	"errors"
	"io"
	"sync"
	"testing"
	"time"

	"github.com/go-kratos/kratos/v2/log"
	tracesdk "go.opentelemetry.io/otel/sdk/trace"
)

type memERPRepo struct {
	mu      sync.Mutex
	nextID  int
	records map[string][]*ERPRecord
}

func newMemERPRepo() *memERPRepo {
	return &memERPRepo{
		nextID:  1,
		records: map[string][]*ERPRecord{},
	}
}

func (r *memERPRepo) ListByModule(ctx context.Context, moduleKey string) ([]*ERPRecord, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	rows := r.records[moduleKey]
	out := make([]*ERPRecord, 0, len(rows))
	for _, item := range rows {
		out = append(out, cloneERPRecord(item))
	}
	return out, nil
}

func (r *memERPRepo) Create(ctx context.Context, moduleKey string, payload map[string]any, createdByAdminID int) (*ERPRecord, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	now := time.Now()
	code, _ := payload["code"].(string)
	box, _ := payload["box"].(string)
	record := &ERPRecord{
		ID:        r.nextID,
		ModuleKey: moduleKey,
		Code:      code,
		Box:       box,
		Payload:   cloneMap(payload),
		CreatedAt: now,
		UpdatedAt: now,
	}
	if createdByAdminID > 0 {
		record.CreatedByAdminID = &createdByAdminID
		record.UpdatedByAdminID = &createdByAdminID
	}
	r.nextID++
	r.records[moduleKey] = append([]*ERPRecord{record}, r.records[moduleKey]...)
	return cloneERPRecord(record), nil
}

func (r *memERPRepo) Update(ctx context.Context, moduleKey string, id int, payload map[string]any, updatedByAdminID int) (*ERPRecord, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	rows := r.records[moduleKey]
	for index, item := range rows {
		if item.ID != id {
			continue
		}
		code, _ := payload["code"].(string)
		box, _ := payload["box"].(string)
		item.Code = code
		item.Box = box
		item.Payload = cloneMap(payload)
		item.UpdatedAt = time.Now()
		if updatedByAdminID > 0 {
			item.UpdatedByAdminID = &updatedByAdminID
		}
		rows[index] = item
		return cloneERPRecord(item), nil
	}
	return nil, ErrERPRecordNotFound
}

func (r *memERPRepo) Delete(ctx context.Context, moduleKey string, id int) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	rows := r.records[moduleKey]
	for index, item := range rows {
		if item.ID != id {
			continue
		}
		r.records[moduleKey] = append(rows[:index], rows[index+1:]...)
		return nil
	}
	return ErrERPRecordNotFound
}

func TestERPUsecaseCRUD(t *testing.T) {
	repo := newMemERPRepo()
	logger := log.NewStdLogger(io.Discard)
	uc := NewERPUsecase(repo, logger, tracesdk.NewTracerProvider())

	ctx := context.Background()
	created, err := uc.Create(ctx, "partners", map[string]any{
		"code":             "CS-001",
		"partnerType":      "合作客户",
		"name":             "客户A",
		"address":          "浙江杭州",
		"contact":          "张三",
		"contactPhone":     "13800001111",
		"paymentCycleDays": 30,
		"box":              "免批",
	}, 1)
	if err != nil {
		t.Fatalf("create failed: %v", err)
	}
	if created["code"] != "CS-001" {
		t.Fatalf("unexpected code: %v", created["code"])
	}

	listed, err := uc.List(ctx, "partners")
	if err != nil {
		t.Fatalf("list failed: %v", err)
	}
	if len(listed) != 1 {
		t.Fatalf("expected 1 record, got %d", len(listed))
	}

	id, ok := created["id"].(int)
	if !ok {
		t.Fatalf("id should be int, got %T", created["id"])
	}
	updated, err := uc.Update(ctx, "partners", id, map[string]any{
		"code":             "CS-001",
		"partnerType":      "合作客户",
		"name":             "客户A-更新",
		"address":          "浙江杭州",
		"contact":          "张三",
		"contactPhone":     "13800001111",
		"paymentCycleDays": 45,
		"box":              "草稿箱",
	}, 2)
	if err != nil {
		t.Fatalf("update failed: %v", err)
	}
	if updated["name"] != "客户A-更新" {
		t.Fatalf("unexpected updated name: %v", updated["name"])
	}

	if err := uc.Delete(ctx, "partners", id); err != nil {
		t.Fatalf("delete failed: %v", err)
	}
	afterDelete, err := uc.List(ctx, "partners")
	if err != nil {
		t.Fatalf("list after delete failed: %v", err)
	}
	if len(afterDelete) != 0 {
		t.Fatalf("expected no records after delete, got %d", len(afterDelete))
	}
}

func TestERPUsecaseInvalidArgs(t *testing.T) {
	repo := newMemERPRepo()
	logger := log.NewStdLogger(io.Discard)
	uc := NewERPUsecase(repo, logger, tracesdk.NewTracerProvider())

	_, err := uc.List(context.Background(), "")
	if !errors.Is(err, ErrERPInvalidModule) {
		t.Fatalf("expected ErrERPInvalidModule, got %v", err)
	}
	_, err = uc.List(context.Background(), "unknown_module")
	if !errors.Is(err, ErrERPInvalidModule) {
		t.Fatalf("expected ErrERPInvalidModule for unknown module, got %v", err)
	}

	_, err = uc.Create(context.Background(), "partners", nil, 1)
	if !errors.Is(err, ErrERPInvalidRecord) {
		t.Fatalf("expected ErrERPInvalidRecord, got %v", err)
	}
}

func TestERPUsecaseDeriveFields(t *testing.T) {
	repo := newMemERPRepo()
	logger := log.NewStdLogger(io.Discard)
	uc := NewERPUsecase(repo, logger, tracesdk.NewTracerProvider())

	settlement, err := uc.Create(context.Background(), "settlements", map[string]any{
		"invoiceNo":        "INV-001",
		"shipDate":         "2026-02-10",
		"paymentCycleDays": 30,
		"amount":           8000,
	}, 1)
	if err != nil {
		t.Fatalf("create settlement failed: %v", err)
	}
	if settlement["receivableDate"] != "2026-03-12" {
		t.Fatalf("receivableDate should be 2026-03-12, got %v", settlement["receivableDate"])
	}

	quotation, err := uc.Create(context.Background(), "quotations", map[string]any{
		"customerName": "客户A",
		"quotedDate":   "2026-02-10",
		"currency":     "USD",
		"items": []any{
			map[string]any{
				"productName": "产品1",
				"quantity":    2,
				"unitPrice":   5,
			},
			map[string]any{
				"productName": "产品2",
				"quantity":    3,
				"unitPrice":   10,
			},
		},
	}, 1)
	if err != nil {
		t.Fatalf("create quotation failed: %v", err)
	}

	totalAmount, ok := quotation["totalAmount"].(int64)
	if !ok {
		t.Fatalf("totalAmount should be int64, got %T", quotation["totalAmount"])
	}
	if totalAmount != 40 {
		t.Fatalf("totalAmount should be 40, got %d", totalAmount)
	}
}

func TestERPUsecaseValidateBox(t *testing.T) {
	repo := newMemERPRepo()
	logger := log.NewStdLogger(io.Discard)
	uc := NewERPUsecase(repo, logger, tracesdk.NewTracerProvider())

	_, err := uc.Create(context.Background(), "partners", map[string]any{
		"partnerType":      "合作客户",
		"name":             "客户A",
		"address":          "浙江杭州",
		"contact":          "张三",
		"contactPhone":     "13800001111",
		"paymentCycleDays": 30,
		"box":              "不存在状态",
	}, 1)
	if !errors.Is(err, ErrERPInvalidRecord) {
		t.Fatalf("expected ErrERPInvalidRecord, got %v", err)
	}
}

func cloneERPRecord(input *ERPRecord) *ERPRecord {
	if input == nil {
		return nil
	}
	out := *input
	out.Payload = cloneMap(input.Payload)
	return &out
}

func cloneMap(input map[string]any) map[string]any {
	out := make(map[string]any, len(input))
	for key, value := range input {
		out[key] = value
	}
	return out
}
