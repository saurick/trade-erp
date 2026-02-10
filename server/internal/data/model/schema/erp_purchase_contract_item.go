package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/dialect"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
)

// ERPPurchaseContractItem 采购合同明细。
type ERPPurchaseContractItem struct {
	ent.Schema
}

func (ERPPurchaseContractItem) Fields() []ent.Field {
	return []ent.Field{
		field.Int("purchase_contract_id").
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
		field.String("spec_code").
			Optional().
			Nillable().
			MaxLen(128),
		field.Float("quantity").
			Default(0).
			SchemaType(map[string]string{dialect.MySQL: "decimal(20,6)"}),
		field.Float("unit_price").
			Default(0).
			SchemaType(map[string]string{dialect.MySQL: "decimal(20,6)"}),
		field.Float("total_price").
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

func (ERPPurchaseContractItem) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("purchase_contract_id", "line_no").Unique(),
		index.Fields("product_id"),
		index.Fields("product_code"),
	}
}
