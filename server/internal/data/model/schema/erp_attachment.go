package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
)

// ERPAttachment 业务附件元数据。
type ERPAttachment struct {
	ent.Schema
}

func (ERPAttachment) Fields() []ent.Field {
	return []ent.Field{
		field.String("category").
			Default("attachments").
			MaxLen(64),
		field.String("biz_module").
			NotEmpty().
			MaxLen(64),
		field.String("biz_code").
			NotEmpty().
			MaxLen(128),
		field.String("file_name").
			NotEmpty().
			MaxLen(255),
		field.String("file_url").
			NotEmpty().
			MaxLen(1024),
		field.String("mime_type").
			Optional().
			Nillable().
			MaxLen(128),
		field.Int64("file_size").
			Default(0),
		field.Int("uploaded_by_admin_id").
			Optional().
			Nillable(),
		field.Time("created_at").
			Default(time.Now).
			Immutable(),
	}
}

func (ERPAttachment) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("biz_module", "biz_code", "category"),
		index.Fields("created_at"),
	}
}
