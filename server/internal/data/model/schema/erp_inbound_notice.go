package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
)

// ERPInboundNotice 入库通知/检验主表。
type ERPInboundNotice struct {
	ent.Schema
}

func (ERPInboundNotice) Fields() []ent.Field {
	return []ent.Field{
		field.String("code").
			NotEmpty().
			MaxLen(128),
		field.Int("purchase_contract_id").
			Optional().
			Nillable(),
		field.String("source_purchase_code").
			Optional().
			Nillable().
			MaxLen(128),
		field.String("entry_no").
			Optional().
			Nillable().
			MaxLen(128),
		field.Int("warehouse_id").
			Optional().
			Nillable(),
		field.Int("location_id").
			Optional().
			Nillable(),
		field.String("qc_status").
			Default("pending").
			MaxLen(32).
			Comment("pending/passed/rejected"),
		field.String("inbound_status").
			Default("pending").
			MaxLen(32).
			Comment("pending/allowed/inbounded"),
		field.Time("allow_inbound_at").
			Optional().
			Nillable(),
		field.String("remark").
			Optional().
			Nillable().
			MaxLen(512),
		field.Int("created_by_admin_id").
			Optional().
			Nillable(),
		field.Int("updated_by_admin_id").
			Optional().
			Nillable(),
		field.Time("created_at").
			Default(time.Now).
			Immutable(),
		field.Time("updated_at").
			Default(time.Now).
			UpdateDefault(time.Now),
	}
}

func (ERPInboundNotice) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("code").Unique(),
		index.Fields("purchase_contract_id"),
		index.Fields("qc_status", "inbound_status"),
		index.Fields("inbound_status", "created_at"),
	}
}
