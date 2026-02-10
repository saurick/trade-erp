package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/dialect"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
)

// ERPShipmentDetail 出运明细主表。
type ERPShipmentDetail struct {
	ent.Schema
}

func (ERPShipmentDetail) Fields() []ent.Field {
	return []ent.Field{
		field.String("code").
			NotEmpty().
			MaxLen(128),
		field.Int("export_sale_id").
			Optional().
			Nillable(),
		field.String("source_export_code").
			Optional().
			Nillable().
			MaxLen(128),
		field.Int("customer_partner_id").
			Optional().
			Nillable(),
		field.String("customer_code").
			Optional().
			Nillable().
			MaxLen(64),
		field.String("start_port").
			Optional().
			Nillable().
			MaxLen(64),
		field.String("dest_port").
			Optional().
			Nillable().
			MaxLen(64),
		field.String("ship_to_address").
			Optional().
			Nillable().
			MaxLen(255),
		field.String("arrive_country").
			Optional().
			Nillable().
			MaxLen(64),
		field.String("transport_type").
			Optional().
			Nillable().
			MaxLen(32),
		field.String("sales_owner").
			Optional().
			Nillable().
			MaxLen(64),
		field.Time("warehouse_ship_date"),
		field.Float("total_packages").
			Default(0).
			SchemaType(map[string]string{dialect.MySQL: "decimal(20,6)"}),
		field.Float("total_amount").
			Default(0).
			SchemaType(map[string]string{dialect.MySQL: "decimal(20,6)"}),
		field.String("status").
			Default("draft").
			MaxLen(32),
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

func (ERPShipmentDetail) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("code").Unique(),
		index.Fields("export_sale_id"),
		index.Fields("customer_partner_id"),
		index.Fields("status", "warehouse_ship_date"),
	}
}
