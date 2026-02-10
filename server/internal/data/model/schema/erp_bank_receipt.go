package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/dialect"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
)

// ERPBankReceipt 水单登记。
type ERPBankReceipt struct {
	ent.Schema
}

func (ERPBankReceipt) Fields() []ent.Field {
	return []ent.Field{
		field.String("code").
			NotEmpty().
			MaxLen(128),
		field.Time("register_date"),
		field.String("fund_type").
			NotEmpty().
			MaxLen(64),
		field.String("currency").
			Default("USD").
			MaxLen(16),
		field.Float("received_amount").
			SchemaType(map[string]string{dialect.MySQL: "decimal(20,6)"}),
		field.Float("bank_fee").
			Default(0).
			SchemaType(map[string]string{dialect.MySQL: "decimal(20,6)"}),
		field.Float("net_amount").
			Default(0).
			SchemaType(map[string]string{dialect.MySQL: "decimal(20,6)"}),
		field.String("ref_no").
			Optional().
			Nillable().
			MaxLen(128),
		field.String("status").
			Default("claim").
			MaxLen(32).
			Comment("claim/confirmed/closed"),
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

func (ERPBankReceipt) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("code").Unique(),
		index.Fields("status", "register_date"),
		index.Fields("ref_no"),
	}
}
