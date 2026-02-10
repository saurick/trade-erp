package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
)

// ERPDocLink 单据链路关系。
type ERPDocLink struct {
	ent.Schema
}

func (ERPDocLink) Fields() []ent.Field {
	return []ent.Field{
		field.String("from_module").
			NotEmpty().
			MaxLen(64),
		field.String("from_code").
			NotEmpty().
			MaxLen(128),
		field.String("to_module").
			NotEmpty().
			MaxLen(64),
		field.String("to_code").
			NotEmpty().
			MaxLen(128),
		field.String("relation_type").
			Default("derived").
			MaxLen(64),
		field.Time("created_at").
			Default(time.Now).
			Immutable(),
	}
}

func (ERPDocLink) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("from_module", "from_code", "to_module", "to_code", "relation_type").Unique(),
		index.Fields("from_module", "from_code"),
		index.Fields("to_module", "to_code"),
	}
}
