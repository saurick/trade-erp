package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/dialect"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
)

// ERPExportSale 外销主表。
type ERPExportSale struct {
	ent.Schema
}

func (ERPExportSale) Fields() []ent.Field {
	return []ent.Field{
		field.String("code").
			NotEmpty().
			MaxLen(128),
		field.Int("quotation_id").
			Optional().
			Nillable(),
		field.String("source_quotation_code").
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
		field.String("customer_contract_no").
			Optional().
			Nillable().
			MaxLen(128),
		field.String("order_no").
			Optional().
			Nillable().
			MaxLen(128),
		field.Time("order_date"),
		field.Time("sign_date"),
		field.Time("delivery_date"),
		field.String("transport_type").
			Optional().
			Nillable().
			MaxLen(32),
		field.String("payment_method").
			Optional().
			Nillable().
			MaxLen(32),
		field.String("price_term").
			Optional().
			Nillable().
			MaxLen(32),
		field.String("start_place").
			Optional().
			Nillable().
			MaxLen(64),
		field.String("end_place").
			Optional().
			Nillable().
			MaxLen(64),
		field.String("order_flow").
			Optional().
			Nillable().
			MaxLen(32),
		field.Float("total_amount").
			Default(0).
			SchemaType(map[string]string{dialect.MySQL: "decimal(20,6)"}),
		field.String("status").
			Default("draft").
			MaxLen(32).
			Comment("draft/pending/approved/rejected"),
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

func (ERPExportSale) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("code").Unique(),
		index.Fields("quotation_id"),
		index.Fields("customer_partner_id"),
		index.Fields("status", "sign_date"),
	}
}
