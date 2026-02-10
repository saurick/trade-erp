package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/dialect"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
)

// ERPStockBalance 库存余额快照。
type ERPStockBalance struct {
	ent.Schema
}

func (ERPStockBalance) Fields() []ent.Field {
	return []ent.Field{
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
		field.Float("available_qty").
			Default(0).
			SchemaType(map[string]string{dialect.MySQL: "decimal(20,6)"}),
		field.Float("locked_qty").
			Default(0).
			SchemaType(map[string]string{dialect.MySQL: "decimal(20,6)"}),
		field.Int64("version").
			Default(0).
			Comment("乐观锁版本号"),
		field.Time("created_at").
			Default(time.Now).
			Immutable(),
		field.Time("updated_at").
			Default(time.Now).
			UpdateDefault(time.Now),
	}
}

func (ERPStockBalance) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("product_code", "warehouse_id", "location_id", "lot_no").Unique(),
		index.Fields("warehouse_id", "location_id"),
		index.Fields("product_code"),
	}
}
