package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/dialect"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
)

// ERPExportSaleItem 外销明细。
type ERPExportSaleItem struct {
	ent.Schema
}

func (ERPExportSaleItem) Fields() []ent.Field {
	return []ent.Field{
		field.Int("export_sale_id").
			Positive(),
		field.Int("line_no").
			NonNegative(),
		field.Int("product_id").
			Optional().
			Nillable(),
		field.String("product_code").
			Optional().
			Nillable().
			MaxLen(128),
		field.String("product_name").
			Optional().
			Nillable().
			MaxLen(255),
		field.String("cn_desc").
			Optional().
			Nillable().
			MaxLen(255),
		field.String("en_desc").
			Optional().
			Nillable().
			MaxLen(255),
		field.Float("quantity").
			Default(0).
			SchemaType(map[string]string{dialect.MySQL: "decimal(20,6)"}),
		field.Float("unit_price").
			Default(0).
			SchemaType(map[string]string{dialect.MySQL: "decimal(20,6)"}),
		field.Float("total_price").
			Default(0).
			SchemaType(map[string]string{dialect.MySQL: "decimal(20,6)"}),
		field.String("pack_detail").
			Optional().
			Nillable().
			MaxLen(255),
		field.Time("created_at").
			Default(time.Now).
			Immutable(),
		field.Time("updated_at").
			Default(time.Now).
			UpdateDefault(time.Now),
	}
}

func (ERPExportSaleItem) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("export_sale_id", "line_no").Unique(),
		index.Fields("product_id"),
		index.Fields("product_code"),
	}
}
