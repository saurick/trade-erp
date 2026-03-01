package data

import (
	"errors"
	"testing"
	"time"

	"server/internal/biz"
	"server/internal/data/model/ent"
)

func TestToBizERPRecord_InvalidPayload(t *testing.T) {
	row := &ent.ERPModuleRecord{
		ID:        1,
		ModuleKey: "products",
		Payload:   `{"attachment":"/files/demo.pdf",`,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	_, err := toBizERPRecord(row)
	if !errors.Is(err, biz.ErrERPInvalidRecord) {
		t.Fatalf("expected ErrERPInvalidRecord, got %v", err)
	}
}

func TestToBizERPRecord_ParsePayloadSuccess(t *testing.T) {
	code := "PD-001"
	box := "免批"
	now := time.Now()
	row := &ent.ERPModuleRecord{
		ID:        2,
		ModuleKey: "products",
		Code:      &code,
		Box:       &box,
		Payload:   `{"attachment":"/files/demo.pdf","hsCode":"85051110"}`,
		CreatedAt: now,
		UpdatedAt: now,
	}

	record, err := toBizERPRecord(row)
	if err != nil {
		t.Fatalf("toBizERPRecord should succeed, got %v", err)
	}
	if record.Code != code || record.Box != box {
		t.Fatalf("unexpected code/box: %+v", record)
	}
	if got := record.Payload["attachment"]; got != "/files/demo.pdf" {
		t.Fatalf("unexpected attachment: %v", got)
	}
}
