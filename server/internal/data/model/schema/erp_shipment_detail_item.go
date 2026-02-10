package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/dialect"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
)

// ERPShipmentDetailItem 出运明细行。
type ERPShipmentDetailItem struct {
	ent.Schema
}

func (ERPShipmentDetailItem) Fields() []ent.Field {
	return []ent.Field{
		field.Int("shipment_detail_id").
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
		field.String("product_model").
			Optional().
			Nillable().
			MaxLen(255),
		field.String("pack_detail").
			Optional().
			Nillable().
			MaxLen(255),
		field.Float("quantity").
			Default(0).
			SchemaType(map[string]string{dialect.MySQL: "decimal(20,6)"}),
		field.Float("unit_price").
			Default(0).
			SchemaType(map[string]string{dialect.MySQL: "decimal(20,6)"}),
		field.Float("total_price").
			Default(0).
			SchemaType(map[string]string{dialect.MySQL: "decimal(20,6)"}),
		field.Float("net_weight").
			Default(0).
			SchemaType(map[string]string{dialect.MySQL: "decimal(20,6)"}),
		field.Float("gross_weight").
			Default(0).
			SchemaType(map[string]string{dialect.MySQL: "decimal(20,6)"}),
		field.Float("volume").
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

func (ERPShipmentDetailItem) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("shipment_detail_id", "line_no").Unique(),
		index.Fields("product_id"),
		index.Fields("product_code"),
	}
}
