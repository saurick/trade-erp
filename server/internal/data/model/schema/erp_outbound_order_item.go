package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/dialect"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
)

// ERPOutboundOrderItem 出库明细。
type ERPOutboundOrderItem struct {
	ent.Schema
}

func (ERPOutboundOrderItem) Fields() []ent.Field {
	return []ent.Field{
		field.Int("outbound_order_id").
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
		field.String("lot_no").
			Optional().
			Nillable().
			MaxLen(64),
		field.Float("quantity").
			Default(0).
			SchemaType(map[string]string{dialect.MySQL: "decimal(20,6)"}),
		field.Time("created_at").
			Default(time.Now).
			Immutable(),
		field.Time("updated_at").
			Default(time.Now).
			UpdateDefault(time.Now),
	}
}

func (ERPOutboundOrderItem) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("outbound_order_id", "line_no").Unique(),
		index.Fields("product_id"),
		index.Fields("product_code"),
	}
}
