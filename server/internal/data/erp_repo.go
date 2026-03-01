package data

import (
	"context"
	"encoding/json"
	"fmt"

	"server/internal/biz"
	"server/internal/data/model/ent"
	"server/internal/data/model/ent/erpmodulerecord"

	"github.com/go-kratos/kratos/v2/log"
)

type erpRepo struct {
	data *Data
	log  *log.Helper
}

func NewERPRepo(d *Data, logger log.Logger) *erpRepo {
	return &erpRepo{
		data: d,
		log:  log.NewHelper(log.With(logger, "module", "data.erp_repo")),
	}
}

var _ biz.ERPRepo = (*erpRepo)(nil)

func (r *erpRepo) ListByModule(ctx context.Context, moduleKey string) ([]*biz.ERPRecord, error) {
	rows, err := r.data.mysql.ERPModuleRecord.
		Query().
		Where(erpmodulerecord.ModuleKeyEQ(moduleKey)).
		Order(ent.Desc(erpmodulerecord.FieldID)).
		All(ctx)
	if err != nil {
		return nil, err
	}

	out := make([]*biz.ERPRecord, 0, len(rows))
	for _, row := range rows {
		item, err := toBizERPRecord(row)
		if err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	return out, nil
}

func (r *erpRepo) Create(ctx context.Context, moduleKey string, payload map[string]any, createdByAdminID int) (*biz.ERPRecord, error) {
	payloadJSON, err := json.Marshal(payload)
	if err != nil {
		return nil, biz.ErrERPInvalidRecord
	}

	create := r.data.mysql.ERPModuleRecord.
		Create().
		SetModuleKey(moduleKey).
		SetPayload(string(payloadJSON))

	if code := getPayloadString(payload, "code"); code != "" {
		create = create.SetCode(code)
	}
	if box := getPayloadString(payload, "box"); box != "" {
		create = create.SetBox(box)
	}
	if createdByAdminID > 0 {
		create = create.SetCreatedByAdminID(createdByAdminID)
		create = create.SetUpdatedByAdminID(createdByAdminID)
	}

	row, err := create.Save(ctx)
	if err != nil {
		return nil, normalizeERPRepoError(err)
	}
	return toBizERPRecord(row)
}

func (r *erpRepo) Update(ctx context.Context, moduleKey string, id int, payload map[string]any, updatedByAdminID int) (*biz.ERPRecord, error) {
	row, err := r.data.mysql.ERPModuleRecord.
		Query().
		Where(
			erpmodulerecord.IDEQ(id),
			erpmodulerecord.ModuleKeyEQ(moduleKey),
		).
		Only(ctx)
	if err != nil {
		if ent.IsNotFound(err) {
			return nil, biz.ErrERPRecordNotFound
		}
		return nil, err
	}

	payloadJSON, err := json.Marshal(payload)
	if err != nil {
		return nil, biz.ErrERPInvalidRecord
	}

	update := r.data.mysql.ERPModuleRecord.UpdateOneID(row.ID).SetPayload(string(payloadJSON))
	if code := getPayloadString(payload, "code"); code != "" {
		update = update.SetCode(code)
	} else {
		update = update.ClearCode()
	}
	if box := getPayloadString(payload, "box"); box != "" {
		update = update.SetBox(box)
	} else {
		update = update.ClearBox()
	}
	if updatedByAdminID > 0 {
		update = update.SetUpdatedByAdminID(updatedByAdminID)
	}

	saved, err := update.Save(ctx)
	if err != nil {
		if ent.IsNotFound(err) {
			return nil, biz.ErrERPRecordNotFound
		}
		return nil, normalizeERPRepoError(err)
	}
	return toBizERPRecord(saved)
}

func (r *erpRepo) Delete(ctx context.Context, moduleKey string, id int) error {
	affected, err := r.data.mysql.ERPModuleRecord.
		Delete().
		Where(
			erpmodulerecord.IDEQ(id),
			erpmodulerecord.ModuleKeyEQ(moduleKey),
		).
		Exec(ctx)
	if err != nil {
		return err
	}
	if affected == 0 {
		return biz.ErrERPRecordNotFound
	}
	return nil
}

func toBizERPRecord(row *ent.ERPModuleRecord) (*biz.ERPRecord, error) {
	if row == nil {
		return nil, biz.ErrERPRecordNotFound
	}

	payload := map[string]any{}
	if row.Payload != "" {
		if err := json.Unmarshal([]byte(row.Payload), &payload); err != nil {
			return nil, fmt.Errorf("%w: payload 反序列化失败: %v", biz.ErrERPInvalidRecord, err)
		}
	}

	code := ""
	if row.Code != nil {
		code = *row.Code
	}
	box := ""
	if row.Box != nil {
		box = *row.Box
	}

	return &biz.ERPRecord{
		ID:               row.ID,
		ModuleKey:        row.ModuleKey,
		Code:             code,
		Box:              box,
		Payload:          payload,
		CreatedByAdminID: row.CreatedByAdminID,
		UpdatedByAdminID: row.UpdatedByAdminID,
		CreatedAt:        row.CreatedAt,
		UpdatedAt:        row.UpdatedAt,
	}, nil
}

func getPayloadString(payload map[string]any, key string) string {
	raw, ok := payload[key]
	if !ok || raw == nil {
		return ""
	}
	value, ok := raw.(string)
	if !ok {
		return ""
	}
	return value
}

func normalizeERPRepoError(err error) error {
	if err == nil {
		return nil
	}
	// 将存储层可识别的字段/约束错误归一为业务错误，避免前端收到笼统 50000。
	if ent.IsValidationError(err) || ent.IsConstraintError(err) {
		return fmt.Errorf("%w: %v", biz.ErrERPInvalidRecord, err)
	}
	return err
}
