package biz

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"time"

	"github.com/go-kratos/kratos/v2/log"
	tracesdk "go.opentelemetry.io/otel/sdk/trace"
)

type ERPRecord struct {
	ID               int
	ModuleKey        string
	Code             string
	Box              string
	Payload          map[string]any
	CreatedByAdminID *int
	UpdatedByAdminID *int
	CreatedAt        time.Time
	UpdatedAt        time.Time
}

type ERPRepo interface {
	ListByModule(ctx context.Context, moduleKey string) ([]*ERPRecord, error)
	Create(ctx context.Context, moduleKey string, payload map[string]any, createdByAdminID int) (*ERPRecord, error)
	Update(ctx context.Context, moduleKey string, id int, payload map[string]any, updatedByAdminID int) (*ERPRecord, error)
	Delete(ctx context.Context, moduleKey string, id int) error
}

type ERPUsecase struct {
	repo ERPRepo
	log  *log.Helper
	tp   *tracesdk.TracerProvider
}

func NewERPUsecase(repo ERPRepo, logger log.Logger, tp *tracesdk.TracerProvider) *ERPUsecase {
	return &ERPUsecase{
		repo: repo,
		log:  log.NewHelper(log.With(logger, "module", "biz.erp")),
		tp:   tp,
	}
}

var (
	ErrERPInvalidModule  = errors.New("invalid module")
	ErrERPInvalidRecord  = errors.New("invalid record")
	ErrERPRecordNotFound = errors.New("erp record not found")
)

func (uc *ERPUsecase) List(ctx context.Context, moduleKey string) ([]map[string]any, error) {
	var err error
	moduleKey, err = normalizeERPModuleKey(moduleKey)
	if err != nil {
		return nil, err
	}

	records, err := uc.repo.ListByModule(ctx, moduleKey)
	if err != nil {
		return nil, err
	}

	out := make([]map[string]any, 0, len(records))
	for _, item := range records {
		out = append(out, toERPRecordView(item))
	}
	return out, nil
}

func (uc *ERPUsecase) Create(ctx context.Context, moduleKey string, payload map[string]any, operatorAdminID int) (map[string]any, error) {
	var err error
	moduleKey, err = normalizeERPModuleKey(moduleKey)
	if err != nil {
		return nil, err
	}
	cleanPayload, err := normalizeERPPayload(payload)
	if err != nil {
		return nil, err
	}
	cleanPayload, err = applyERPModuleRules(moduleKey, cleanPayload)
	if err != nil {
		return nil, err
	}

	record, err := uc.repo.Create(ctx, moduleKey, cleanPayload, operatorAdminID)
	if err != nil {
		return nil, err
	}
	return toERPRecordView(record), nil
}

func (uc *ERPUsecase) Update(ctx context.Context, moduleKey string, id int, payload map[string]any, operatorAdminID int) (map[string]any, error) {
	var err error
	moduleKey, err = normalizeERPModuleKey(moduleKey)
	if err != nil {
		return nil, err
	}
	if id <= 0 {
		return nil, ErrBadParam
	}
	cleanPayload, err := normalizeERPPayload(payload)
	if err != nil {
		return nil, err
	}
	cleanPayload, err = applyERPModuleRules(moduleKey, cleanPayload)
	if err != nil {
		return nil, err
	}

	record, err := uc.repo.Update(ctx, moduleKey, id, cleanPayload, operatorAdminID)
	if err != nil {
		return nil, err
	}
	return toERPRecordView(record), nil
}

func (uc *ERPUsecase) Delete(ctx context.Context, moduleKey string, id int) error {
	var err error
	moduleKey, err = normalizeERPModuleKey(moduleKey)
	if err != nil {
		return err
	}
	if id <= 0 {
		return ErrBadParam
	}
	return uc.repo.Delete(ctx, moduleKey, id)
}

func normalizeERPPayload(input map[string]any) (map[string]any, error) {
	if input == nil {
		return nil, ErrERPInvalidRecord
	}

	copyMap := make(map[string]any, len(input))
	for key, value := range input {
		k := strings.TrimSpace(key)
		if k == "" {
			continue
		}
		if k == "id" || k == "module_key" || k == "created_at" || k == "updated_at" {
			continue
		}
		copyMap[k] = value
	}

	raw, err := json.Marshal(copyMap)
	if err != nil {
		return nil, ErrERPInvalidRecord
	}

	normalized := map[string]any{}
	if err := json.Unmarshal(raw, &normalized); err != nil {
		return nil, ErrERPInvalidRecord
	}
	return normalized, nil
}

func toERPRecordView(item *ERPRecord) map[string]any {
	if item == nil {
		return map[string]any{}
	}

	out := make(map[string]any, len(item.Payload)+4)
	for key, value := range item.Payload {
		out[key] = value
	}
	out["id"] = item.ID
	if item.Code != "" {
		out["code"] = item.Code
	}
	if item.Box != "" {
		out["box"] = item.Box
	}
	out["module_key"] = item.ModuleKey
	out["created_at"] = item.CreatedAt.Unix()
	out["updated_at"] = item.UpdatedAt.Unix()
	return out
}
