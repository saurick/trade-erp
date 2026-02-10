package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
)

// ERPPartner 客户/供应商主数据。
type ERPPartner struct {
	ent.Schema
}

func (ERPPartner) Fields() []ent.Field {
	return []ent.Field{
		field.String("code").
			NotEmpty().
			MaxLen(64),
		field.String("partner_type").
			NotEmpty().
			MaxLen(32).
			Comment("customer/supplier/both"),
		field.String("name").
			NotEmpty().
			MaxLen(128),
		field.String("short_name").
			Optional().
			Nillable().
			MaxLen(128),
		field.String("tax_no").
			Optional().
			Nillable().
			MaxLen(64),
		field.String("currency").
			Default("USD").
			MaxLen(16),
		field.Int("payment_cycle_days").
			Default(0),
		field.String("address").
			Optional().
			Nillable().
			MaxLen(255),
		field.String("contact").
			Optional().
			Nillable().
			MaxLen(64),
		field.String("contact_phone").
			Optional().
			Nillable().
			MaxLen(64),
		field.String("email").
			Optional().
			Nillable().
			MaxLen(128),
		field.Bool("disabled").
			Default(false),
		field.Text("extra_json").
			Optional().
			Nillable(),
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

func (ERPPartner) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("code").Unique(),
		index.Fields("partner_type"),
		index.Fields("name"),
	}
}
