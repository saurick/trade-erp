package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
)

// ERPProduct 产品主数据。
type ERPProduct struct {
	ent.Schema
}

func (ERPProduct) Fields() []ent.Field {
	return []ent.Field{
		field.String("code").
			NotEmpty().
			MaxLen(128),
		field.String("hs_code").
			Optional().
			Nillable().
			MaxLen(64),
		field.String("spec_code").
			Optional().
			Nillable().
			MaxLen(128),
		field.String("drawing_no").
			Optional().
			Nillable().
			MaxLen(128),
		field.String("cn_desc").
			Optional().
			Nillable().
			MaxLen(255),
		field.String("en_desc").
			Optional().
			Nillable().
			MaxLen(255),
		field.String("unit").
			Default("pcs").
			MaxLen(32),
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

func (ERPProduct) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("code").Unique(),
		index.Fields("hs_code"),
		index.Fields("spec_code"),
	}
}
