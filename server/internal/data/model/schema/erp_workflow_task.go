package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
)

// ERPWorkflowTask 审批节点任务。
type ERPWorkflowTask struct {
	ent.Schema
}

func (ERPWorkflowTask) Fields() []ent.Field {
	return []ent.Field{
		field.Int("workflow_instance_id").
			Positive(),
		field.String("node_name").
			NotEmpty().
			MaxLen(64),
		field.Int("node_order").
			Default(0),
		field.Int("assignee_admin_id").
			Optional().
			Nillable(),
		field.String("decision").
			Default("pending").
			MaxLen(32).
			Comment("pending/approved/rejected"),
		field.String("comment").
			Optional().
			Nillable().
			MaxLen(512),
		field.Time("acted_at").
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

func (ERPWorkflowTask) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("workflow_instance_id", "node_order").Unique(),
		index.Fields("assignee_admin_id", "decision"),
	}
}
