package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
)

// ERPWorkflowInstance 单据审批流实例。
type ERPWorkflowInstance struct {
	ent.Schema
}

func (ERPWorkflowInstance) Fields() []ent.Field {
	return []ent.Field{
		field.String("biz_module").
			NotEmpty().
			MaxLen(64),
		field.String("biz_code").
			NotEmpty().
			MaxLen(128),
		field.String("current_status").
			Default("draft").
			MaxLen(32),
		field.Int("starter_admin_id").
			Optional().
			Nillable(),
		field.Time("submitted_at").
			Optional().
			Nillable(),
		field.Time("finished_at").
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

func (ERPWorkflowInstance) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("biz_module", "biz_code").Unique(),
		index.Fields("current_status"),
	}
}
