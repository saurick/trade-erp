package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/dialect"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
)

// ERPBankReceiptClaim 水单认领与确认记录。
type ERPBankReceiptClaim struct {
	ent.Schema
}

func (ERPBankReceiptClaim) Fields() []ent.Field {
	return []ent.Field{
		field.Int("receipt_id").
			Positive(),
		field.Int("settlement_id").
			Optional().
			Nillable(),
		field.String("claim_type").
			NotEmpty().
			MaxLen(32).
			Comment("预收/尾款/其他"),
		field.Float("claim_amount").
			SchemaType(map[string]string{dialect.MySQL: "decimal(20,6)"}),
		field.Bool("confirmed").
			Default(false),
		field.Time("confirmed_at").
			Optional().
			Nillable(),
		field.Int("claimed_by_admin_id").
			Optional().
			Nillable(),
		field.Int("confirmed_by_admin_id").
			Optional().
			Nillable(),
		field.String("remark").
			Optional().
			Nillable().
			MaxLen(512),
		field.Time("created_at").
			Default(time.Now).
			Immutable(),
		field.Time("updated_at").
			Default(time.Now).
			UpdateDefault(time.Now),
	}
}

func (ERPBankReceiptClaim) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("receipt_id"),
		index.Fields("settlement_id"),
		index.Fields("confirmed", "created_at"),
	}
}
