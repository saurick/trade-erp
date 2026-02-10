package main

import (
	"database/sql"
	"flag"
	"fmt"
	"os"
	"strings"

	"github.com/go-sql-driver/mysql"
	_ "github.com/go-sql-driver/mysql"
	"gopkg.in/yaml.v3"
)

type bootstrapConfig struct {
	Data struct {
		Mysql struct {
			DSN string `yaml:"dsn"`
		} `yaml:"mysql"`
	} `yaml:"data"`
}

func main() {
	confPath := flag.String("conf", "./configs/dev/config.yaml", "config yaml path")
	flag.Parse()

	dsn, dbName := loadDSN(*confPath)

	db, err := sql.Open("mysql", dsn)
	if err != nil {
		fail("open mysql failed: %v", err)
	}
	defer db.Close()

	required := map[string][]string{
		"users": {
			"id",
			"username",
			"password_hash",
			"role",
			"admin_id",
			"disabled",
			"last_login_at",
			"points",
			"expires_at",
			"created_at",
			"updated_at",
		},
		"admin_users": {
			"id",
			"username",
			"password_hash",
			"level",
			"menu_permissions",
			"parent_id",
			"disabled",
			"last_login_at",
			"created_at",
			"updated_at",
		},
		"erp_module_records": {
			"id",
			"module_key",
			"code",
			"box",
			"payload",
			"created_by_admin_id",
			"updated_by_admin_id",
			"created_at",
			"updated_at",
		},
		"erp_partners": {
			"id",
			"code",
			"partner_type",
			"name",
			"short_name",
			"tax_no",
			"currency",
			"payment_cycle_days",
			"address",
			"contact",
			"contact_phone",
			"email",
			"disabled",
			"extra_json",
			"created_by_admin_id",
			"updated_by_admin_id",
			"created_at",
			"updated_at",
		},
		"erp_products": {
			"id",
			"code",
			"hs_code",
			"spec_code",
			"drawing_no",
			"cn_desc",
			"en_desc",
			"unit",
			"disabled",
			"extra_json",
			"created_by_admin_id",
			"updated_by_admin_id",
			"created_at",
			"updated_at",
		},
		"erp_quotations": {
			"id",
			"code",
			"customer_partner_id",
			"customer_code",
			"quoted_date",
			"currency",
			"price_term",
			"payment_method",
			"delivery_method",
			"start_place",
			"end_place",
			"total_amount",
			"status",
			"accepted",
			"accepted_at",
			"remark",
			"created_by_admin_id",
			"updated_by_admin_id",
			"created_at",
			"updated_at",
		},
		"erp_quotation_items": {
			"id",
			"quotation_id",
			"line_no",
			"product_id",
			"product_code",
			"product_name",
			"quantity",
			"unit_price",
			"total_price",
			"remark",
			"created_at",
			"updated_at",
		},
		"erp_export_sales": {
			"id",
			"code",
			"quotation_id",
			"source_quotation_code",
			"customer_partner_id",
			"customer_code",
			"customer_contract_no",
			"order_no",
			"order_date",
			"sign_date",
			"delivery_date",
			"transport_type",
			"payment_method",
			"price_term",
			"start_place",
			"end_place",
			"order_flow",
			"total_amount",
			"status",
			"remark",
			"created_by_admin_id",
			"updated_by_admin_id",
			"created_at",
			"updated_at",
		},
		"erp_export_sale_items": {
			"id",
			"export_sale_id",
			"line_no",
			"product_id",
			"product_code",
			"product_name",
			"cn_desc",
			"en_desc",
			"quantity",
			"unit_price",
			"total_price",
			"pack_detail",
			"created_at",
			"updated_at",
		},
		"erp_purchase_contracts": {
			"id",
			"code",
			"export_sale_id",
			"source_export_code",
			"supplier_partner_id",
			"supplier_code",
			"sign_date",
			"sales_no",
			"delivery_date",
			"delivery_address",
			"follower",
			"buyer",
			"invoice_required",
			"total_amount",
			"status",
			"remark",
			"created_by_admin_id",
			"updated_by_admin_id",
			"created_at",
			"updated_at",
		},
		"erp_purchase_contract_items": {
			"id",
			"purchase_contract_id",
			"line_no",
			"product_id",
			"product_code",
			"product_name",
			"spec_code",
			"quantity",
			"unit_price",
			"total_price",
			"created_at",
			"updated_at",
		},
		"erp_inbound_notices": {
			"id",
			"code",
			"purchase_contract_id",
			"source_purchase_code",
			"entry_no",
			"warehouse_id",
			"location_id",
			"qc_status",
			"inbound_status",
			"allow_inbound_at",
			"remark",
			"created_by_admin_id",
			"updated_by_admin_id",
			"created_at",
			"updated_at",
		},
		"erp_inbound_notice_items": {
			"id",
			"inbound_notice_id",
			"line_no",
			"product_id",
			"product_code",
			"product_name",
			"lot_no",
			"quantity",
			"passed_qty",
			"rejected_qty",
			"report_attachment_id",
			"created_at",
			"updated_at",
		},
		"erp_shipment_details": {
			"id",
			"code",
			"export_sale_id",
			"source_export_code",
			"customer_partner_id",
			"customer_code",
			"start_port",
			"dest_port",
			"ship_to_address",
			"arrive_country",
			"transport_type",
			"sales_owner",
			"warehouse_ship_date",
			"total_packages",
			"total_amount",
			"status",
			"remark",
			"created_by_admin_id",
			"updated_by_admin_id",
			"created_at",
			"updated_at",
		},
		"erp_shipment_detail_items": {
			"id",
			"shipment_detail_id",
			"line_no",
			"product_id",
			"product_code",
			"product_model",
			"pack_detail",
			"quantity",
			"unit_price",
			"total_price",
			"net_weight",
			"gross_weight",
			"volume",
			"created_at",
			"updated_at",
		},
		"erp_outbound_orders": {
			"id",
			"code",
			"shipment_detail_id",
			"source_shipment_code",
			"warehouse_id",
			"location_id",
			"outbound_date",
			"total_quantity",
			"status",
			"remark",
			"created_by_admin_id",
			"updated_by_admin_id",
			"created_at",
			"updated_at",
		},
		"erp_outbound_order_items": {
			"id",
			"outbound_order_id",
			"line_no",
			"product_id",
			"product_code",
			"lot_no",
			"quantity",
			"created_at",
			"updated_at",
		},
		"erp_warehouses": {
			"id",
			"code",
			"name",
			"disabled",
			"created_at",
			"updated_at",
		},
		"erp_locations": {
			"id",
			"warehouse_id",
			"code",
			"name",
			"disabled",
			"created_at",
			"updated_at",
		},
		"erp_stock_balances": {
			"id",
			"product_code",
			"warehouse_id",
			"location_id",
			"lot_no",
			"available_qty",
			"locked_qty",
			"version",
			"created_at",
			"updated_at",
		},
		"erp_stock_transactions": {
			"id",
			"biz_type",
			"biz_code",
			"biz_line_no",
			"product_code",
			"warehouse_id",
			"location_id",
			"lot_no",
			"delta_qty",
			"before_available_qty",
			"after_available_qty",
			"operator_admin_id",
			"occurred_at",
			"created_at",
		},
		"erp_settlements": {
			"id",
			"code",
			"invoice_no",
			"customer_name",
			"currency",
			"ship_date",
			"payment_cycle_days",
			"receivable_date",
			"amount",
			"received_amount",
			"outstanding_amount",
			"status",
			"source_shipment_code",
			"created_by_admin_id",
			"updated_by_admin_id",
			"created_at",
			"updated_at",
		},
		"erp_bank_receipts": {
			"id",
			"code",
			"register_date",
			"fund_type",
			"currency",
			"received_amount",
			"bank_fee",
			"net_amount",
			"ref_no",
			"status",
			"created_by_admin_id",
			"updated_by_admin_id",
			"created_at",
			"updated_at",
		},
		"erp_bank_receipt_claims": {
			"id",
			"receipt_id",
			"settlement_id",
			"claim_type",
			"claim_amount",
			"confirmed",
			"confirmed_at",
			"claimed_by_admin_id",
			"confirmed_by_admin_id",
			"remark",
			"created_at",
			"updated_at",
		},
		"erp_workflow_instances": {
			"id",
			"biz_module",
			"biz_code",
			"current_status",
			"starter_admin_id",
			"submitted_at",
			"finished_at",
			"created_at",
			"updated_at",
		},
		"erp_workflow_tasks": {
			"id",
			"workflow_instance_id",
			"node_name",
			"node_order",
			"assignee_admin_id",
			"decision",
			"comment",
			"acted_at",
			"created_at",
			"updated_at",
		},
		"erp_workflow_action_logs": {
			"id",
			"workflow_instance_id",
			"workflow_task_id",
			"action",
			"from_status",
			"to_status",
			"operator_admin_id",
			"remark",
			"created_at",
		},
		"erp_doc_links": {
			"id",
			"from_module",
			"from_code",
			"to_module",
			"to_code",
			"relation_type",
			"created_at",
		},
		"erp_sequences": {
			"id",
			"biz_type",
			"current_value",
			"updated_at",
		},
		"erp_attachments": {
			"id",
			"category",
			"biz_module",
			"biz_code",
			"file_name",
			"file_url",
			"mime_type",
			"file_size",
			"uploaded_by_admin_id",
			"created_at",
		},
	}

	for table, cols := range required {
		for _, col := range cols {
			ok, err := columnExists(db, dbName, table, col)
			if err != nil {
				fail("check column failed table=%s column=%s err=%v", table, col, err)
			}
			if !ok {
				fail("missing column: %s.%s", table, col)
			}
		}
	}

	fmt.Println("schema check passed")
}

func loadDSN(confPath string) (string, string) {
	raw, err := os.ReadFile(confPath)
	if err != nil {
		fail("read config failed: %v", err)
	}

	var cfg bootstrapConfig
	if err := yaml.Unmarshal(raw, &cfg); err != nil {
		fail("parse config failed: %v", err)
	}

	dsn := strings.TrimSpace(cfg.Data.Mysql.DSN)
	if dsn == "" {
		fail("mysql dsn is empty in %s", confPath)
	}

	parsed, err := mysql.ParseDSN(dsn)
	if err != nil {
		fail("parse mysql dsn failed: %v", err)
	}
	if parsed.DBName == "" {
		fail("mysql dsn missing db name")
	}

	return dsn, parsed.DBName
}

func columnExists(db *sql.DB, dbName, tableName, columnName string) (bool, error) {
	var count int
	err := db.QueryRow(
		`SELECT COUNT(1) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
		dbName,
		tableName,
		columnName,
	).Scan(&count)
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

func fail(format string, args ...any) {
	fmt.Fprintf(os.Stderr, format+"\n", args...)
	os.Exit(1)
}
