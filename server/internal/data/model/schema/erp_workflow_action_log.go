package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
)

// ERPWorkflowActionLog 审批流动作审计日志。
type ERPWorkflowActionLog struct {
	ent.Schema
}

func (ERPWorkflowActionLog) Fields() []ent.Field {
	return []ent.Field{
		field.Int("workflow_instance_id").
			Positive(),
		field.Int("workflow_task_id").
			Optional().
			Nillable(),
		field.String("action").
			NotEmpty().
			MaxLen(32),
		field.String("from_status").
			Optional().
			Nillable().
			MaxLen(32),
		field.String("to_status").
			Optional().
			Nillable().
			MaxLen(32),
		field.Int("operator_admin_id").
			Optional().
			Nillable(),
		field.String("remark").
			Optional().
			Nillable().
			MaxLen(512),
		field.Time("created_at").
			Default(time.Now).
			Immutable(),
	}
}

func (ERPWorkflowActionLog) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("workflow_instance_id", "created_at"),
		index.Fields("operator_admin_id"),
	}
}
