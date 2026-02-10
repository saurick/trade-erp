package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/dialect"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
)

// ERPInboundNoticeItem 入库通知明细。
type ERPInboundNoticeItem struct {
	ent.Schema
}

func (ERPInboundNoticeItem) Fields() []ent.Field {
	return []ent.Field{
		field.Int("inbound_notice_id").
			Positive(),
		field.Int("line_no").
			NonNegative(),
		field.Int("product_id").
			Optional().
			Nillable(),
		field.String("product_code").
			Optional().
			Nillable().
			MaxLen(128),
		field.String("product_name").
			Optional().
			Nillable().
			MaxLen(255),
		field.String("lot_no").
			Optional().
			Nillable().
			MaxLen(64),
		field.Float("quantity").
			Default(0).
			SchemaType(map[string]string{dialect.MySQL: "decimal(20,6)"}),
		field.Float("passed_qty").
			Default(0).
			SchemaType(map[string]string{dialect.MySQL: "decimal(20,6)"}),
		field.Float("rejected_qty").
			Default(0).
			SchemaType(map[string]string{dialect.MySQL: "decimal(20,6)"}),
		field.Int("report_attachment_id").
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

func (ERPInboundNoticeItem) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("inbound_notice_id", "line_no").Unique(),
		index.Fields("product_id"),
		index.Fields("product_code"),
	}
}
