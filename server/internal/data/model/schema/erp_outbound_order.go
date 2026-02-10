package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/dialect"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
)

// ERPOutboundOrder 出库主表。
type ERPOutboundOrder struct {
	ent.Schema
}

func (ERPOutboundOrder) Fields() []ent.Field {
	return []ent.Field{
		field.String("code").
			NotEmpty().
			MaxLen(128),
		field.Int("shipment_detail_id").
			Optional().
			Nillable(),
		field.String("source_shipment_code").
			Optional().
			Nillable().
			MaxLen(128),
		field.Int("warehouse_id").
			Optional().
			Nillable(),
		field.Int("location_id").
			Optional().
			Nillable(),
		field.Time("outbound_date"),
		field.Float("total_quantity").
			Default(0).
			SchemaType(map[string]string{dialect.MySQL: "decimal(20,6)"}),
		field.String("status").
			Default("draft").
			MaxLen(32).
			Comment("draft/posted/cancelled"),
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

func (ERPOutboundOrder) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("code").Unique(),
		index.Fields("shipment_detail_id"),
		index.Fields("warehouse_id", "location_id"),
		index.Fields("status", "outbound_date"),
	}
}
