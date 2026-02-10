package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/dialect"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
)

// ERPPurchaseContract 采购合同主表。
type ERPPurchaseContract struct {
	ent.Schema
}

func (ERPPurchaseContract) Fields() []ent.Field {
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
		field.Int("supplier_partner_id").
			Optional().
			Nillable(),
		field.String("supplier_code").
			Optional().
			Nillable().
			MaxLen(64),
		field.Time("sign_date"),
		field.String("sales_no").
			Optional().
			Nillable().
			MaxLen(64),
		field.Time("delivery_date"),
		field.String("delivery_address").
			Optional().
			Nillable().
			MaxLen(255),
		field.String("follower").
			Optional().
			Nillable().
			MaxLen(64),
		field.String("buyer").
			Optional().
			Nillable().
			MaxLen(64),
		field.Bool("invoice_required").
			Default(false),
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

func (ERPPurchaseContract) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("code").Unique(),
		index.Fields("export_sale_id"),
		index.Fields("supplier_partner_id"),
		index.Fields("status", "sign_date"),
	}
}
