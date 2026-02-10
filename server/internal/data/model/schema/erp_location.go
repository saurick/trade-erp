package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
)

// ERPLocation 货位主数据。
type ERPLocation struct {
	ent.Schema
}

func (ERPLocation) Fields() []ent.Field {
	return []ent.Field{
		field.Int("warehouse_id").
			Positive(),
		field.String("code").
			NotEmpty().
			MaxLen(64),
		field.String("name").
			Optional().
			Nillable().
			MaxLen(128),
		field.Bool("disabled").
			Default(false),
		field.Time("created_at").
			Default(time.Now).
			Immutable(),
		field.Time("updated_at").
			Default(time.Now).
			UpdateDefault(time.Now),
	}
}

func (ERPLocation) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("warehouse_id", "code").Unique(),
		index.Fields("warehouse_id"),
	}
}
