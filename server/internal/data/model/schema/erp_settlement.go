package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/dialect"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
)

// ERPSettlement 结汇单。
type ERPSettlement struct {
	ent.Schema
}

func (ERPSettlement) Fields() []ent.Field {
	return []ent.Field{
		field.String("code").
			NotEmpty().
			MaxLen(128),
		field.String("invoice_no").
			NotEmpty().
			MaxLen(128),
		field.String("customer_name").
			NotEmpty().
			MaxLen(128),
		field.String("currency").
			Default("USD").
			MaxLen(16),
		field.Time("ship_date"),
		field.Int("payment_cycle_days").
			Default(0),
		field.Time("receivable_date"),
		field.Float("amount").
			SchemaType(map[string]string{dialect.MySQL: "decimal(20,6)"}),
		field.Float("received_amount").
			Default(0).
			SchemaType(map[string]string{dialect.MySQL: "decimal(20,6)"}),
		field.Float("outstanding_amount").
			Default(0).
			SchemaType(map[string]string{dialect.MySQL: "decimal(20,6)"}),
		field.String("status").
			Default("pending").
			MaxLen(32).
			Comment("pending/partial/closed"),
		field.String("source_shipment_code").
			Optional().
			Nillable().
			MaxLen(128),
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

func (ERPSettlement) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("code").Unique(),
		index.Fields("invoice_no"),
		index.Fields("status", "receivable_date"),
		index.Fields("source_shipment_code"),
	}
}
