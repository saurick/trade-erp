package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/dialect"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
)

// ERPQuotation 报价单主表。
type ERPQuotation struct {
	ent.Schema
}

func (ERPQuotation) Fields() []ent.Field {
	return []ent.Field{
		field.String("code").
			NotEmpty().
			MaxLen(128),
		field.Int("customer_partner_id").
			Optional().
			Nillable(),
		field.String("customer_code").
			Optional().
			Nillable().
			MaxLen(64),
		field.Time("quoted_date"),
		field.String("currency").
			Default("USD").
			MaxLen(16),
		field.String("price_term").
			Optional().
			Nillable().
			MaxLen(32),
		field.String("payment_method").
			Optional().
			Nillable().
			MaxLen(32),
		field.String("delivery_method").
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
		field.Float("total_amount").
			Default(0).
			SchemaType(map[string]string{dialect.MySQL: "decimal(20,6)"}),
		field.String("status").
			Default("draft").
			MaxLen(32).
			Comment("draft/pending/approved/rejected"),
		field.Bool("accepted").
			Default(false),
		field.Time("accepted_at").
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

func (ERPQuotation) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("code").Unique(),
		index.Fields("customer_partner_id"),
		index.Fields("status", "quoted_date"),
	}
}
