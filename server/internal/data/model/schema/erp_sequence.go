package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
)

// ERPSequence 业务单号序列。
type ERPSequence struct {
	ent.Schema
}

func (ERPSequence) Fields() []ent.Field {
	return []ent.Field{
		field.String("biz_type").
			NotEmpty().
			MaxLen(64),
		field.Int64("current_value").
			Default(0),
		field.Time("updated_at").
			Default(time.Now).
			UpdateDefault(time.Now),
	}
}

func (ERPSequence) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("biz_type").Unique(),
	}
}
