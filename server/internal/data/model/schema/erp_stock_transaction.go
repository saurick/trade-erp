package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/dialect"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
)

// ERPStockTransaction 库存流水，所有增减都应写入该表。
type ERPStockTransaction struct {
	ent.Schema
}

func (ERPStockTransaction) Fields() []ent.Field {
	return []ent.Field{
		field.String("biz_type").
			NotEmpty().
			MaxLen(32).
			Comment("入库/出库/调整/锁定/解锁"),
		field.String("biz_code").
			NotEmpty().
			MaxLen(128).
			Comment("对应业务单号"),
		field.Int("biz_line_no").
			Default(0).
			Comment("业务明细行号，从0开始"),
		field.String("product_code").
			NotEmpty().
			MaxLen(128),
		field.Int("warehouse_id").
			Positive(),
		field.Int("location_id").
			Positive(),
		field.String("lot_no").
			Default("").
			MaxLen(64),
		field.Float("delta_qty").
			SchemaType(map[string]string{dialect.MySQL: "decimal(20,6)"}),
		field.Float("before_available_qty").
			Default(0).
			SchemaType(map[string]string{dialect.MySQL: "decimal(20,6)"}),
		field.Float("after_available_qty").
			Default(0).
			SchemaType(map[string]string{dialect.MySQL: "decimal(20,6)"}),
		field.Int("operator_admin_id").
			Optional().
			Nillable(),
		field.Time("occurred_at").
			Default(time.Now),
		field.Time("created_at").
			Default(time.Now).
			Immutable(),
	}
}

func (ERPStockTransaction) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("biz_type", "biz_code", "biz_line_no"),
		index.Fields("product_code", "warehouse_id", "location_id"),
		index.Fields("occurred_at"),
	}
}
