package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
)

type ERPModuleRecord struct {
	ent.Schema
}

func (ERPModuleRecord) Fields() []ent.Field {
	return []ent.Field{
		field.String("module_key").
			NotEmpty().
			MaxLen(64),
		field.String("code").
			Optional().
			Nillable().
			MaxLen(128),
		field.String("box").
			Optional().
			Nillable().
			MaxLen(32),
		field.Text("payload").
			Default("{}"),
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

func (ERPModuleRecord) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("module_key"),
		index.Fields("module_key", "code"),
	}
}
