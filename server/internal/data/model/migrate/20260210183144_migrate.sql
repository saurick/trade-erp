-- Create "erp_attachments" table
CREATE TABLE `erp_attachments` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `category` varchar(64) NOT NULL DEFAULT "attachments",
  `biz_module` varchar(64) NOT NULL,
  `biz_code` varchar(128) NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `file_url` varchar(1024) NOT NULL,
  `mime_type` varchar(128) NULL,
  `file_size` bigint NOT NULL DEFAULT 0,
  `uploaded_by_admin_id` bigint NULL,
  `created_at` timestamp NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `erpattachment_biz_module_biz_code_category` (`biz_module`, `biz_code`, `category`),
  INDEX `erpattachment_created_at` (`created_at`)
) CHARSET utf8mb4 COLLATE utf8mb4_bin;
-- Create "erp_bank_receipt_claims" table
CREATE TABLE `erp_bank_receipt_claims` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `receipt_id` bigint NOT NULL,
  `settlement_id` bigint NULL,
  `claim_type` varchar(32) NOT NULL,
  `claim_amount` decimal(20,6) NOT NULL,
  `confirmed` bool NOT NULL DEFAULT 0,
  `confirmed_at` timestamp NULL,
  `claimed_by_admin_id` bigint NULL,
  `confirmed_by_admin_id` bigint NULL,
  `remark` varchar(512) NULL,
  `created_at` timestamp NOT NULL,
  `updated_at` timestamp NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `erpbankreceiptclaim_confirmed_created_at` (`confirmed`, `created_at`),
  INDEX `erpbankreceiptclaim_receipt_id` (`receipt_id`),
  INDEX `erpbankreceiptclaim_settlement_id` (`settlement_id`)
) CHARSET utf8mb4 COLLATE utf8mb4_bin;
-- Create "erp_bank_receipts" table
CREATE TABLE `erp_bank_receipts` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `code` varchar(128) NOT NULL,
  `register_date` timestamp NOT NULL,
  `fund_type` varchar(64) NOT NULL,
  `currency` varchar(16) NOT NULL DEFAULT "USD",
  `received_amount` decimal(20,6) NOT NULL,
  `bank_fee` decimal(20,6) NOT NULL DEFAULT 0.000000,
  `net_amount` decimal(20,6) NOT NULL DEFAULT 0.000000,
  `ref_no` varchar(128) NULL,
  `status` varchar(32) NOT NULL DEFAULT "claim",
  `created_by_admin_id` bigint NULL,
  `updated_by_admin_id` bigint NULL,
  `created_at` timestamp NOT NULL,
  `updated_at` timestamp NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `erpbankreceipt_code` (`code`),
  INDEX `erpbankreceipt_ref_no` (`ref_no`),
  INDEX `erpbankreceipt_status_register_date` (`status`, `register_date`)
) CHARSET utf8mb4 COLLATE utf8mb4_bin;
-- Create "erp_doc_links" table
CREATE TABLE `erp_doc_links` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `from_module` varchar(64) NOT NULL,
  `from_code` varchar(128) NOT NULL,
  `to_module` varchar(64) NOT NULL,
  `to_code` varchar(128) NOT NULL,
  `relation_type` varchar(64) NOT NULL DEFAULT "derived",
  `created_at` timestamp NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `erpdoclink_from_module_from_code` (`from_module`, `from_code`),
  UNIQUE INDEX `erpdoclink_from_module_from_code_to_module_to_code_relation_type` (`from_module`, `from_code`, `to_module`, `to_code`, `relation_type`),
  INDEX `erpdoclink_to_module_to_code` (`to_module`, `to_code`)
) CHARSET utf8mb4 COLLATE utf8mb4_bin;
-- Create "erp_locations" table
CREATE TABLE `erp_locations` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `warehouse_id` bigint NOT NULL,
  `code` varchar(64) NOT NULL,
  `name` varchar(128) NULL,
  `disabled` bool NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL,
  `updated_at` timestamp NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `erplocation_warehouse_id` (`warehouse_id`),
  UNIQUE INDEX `erplocation_warehouse_id_code` (`warehouse_id`, `code`)
) CHARSET utf8mb4 COLLATE utf8mb4_bin;
-- Create "erp_sequences" table
CREATE TABLE `erp_sequences` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `biz_type` varchar(64) NOT NULL,
  `current_value` bigint NOT NULL DEFAULT 0,
  `updated_at` timestamp NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `erpsequence_biz_type` (`biz_type`)
) CHARSET utf8mb4 COLLATE utf8mb4_bin;
-- Create "erp_settlements" table
CREATE TABLE `erp_settlements` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `code` varchar(128) NOT NULL,
  `invoice_no` varchar(128) NOT NULL,
  `customer_name` varchar(128) NOT NULL,
  `currency` varchar(16) NOT NULL DEFAULT "USD",
  `ship_date` timestamp NOT NULL,
  `payment_cycle_days` bigint NOT NULL DEFAULT 0,
  `receivable_date` timestamp NOT NULL,
  `amount` decimal(20,6) NOT NULL,
  `received_amount` decimal(20,6) NOT NULL DEFAULT 0.000000,
  `outstanding_amount` decimal(20,6) NOT NULL DEFAULT 0.000000,
  `status` varchar(32) NOT NULL DEFAULT "pending",
  `source_shipment_code` varchar(128) NULL,
  `created_by_admin_id` bigint NULL,
  `updated_by_admin_id` bigint NULL,
  `created_at` timestamp NOT NULL,
  `updated_at` timestamp NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `erpsettlement_code` (`code`),
  INDEX `erpsettlement_invoice_no` (`invoice_no`),
  INDEX `erpsettlement_source_shipment_code` (`source_shipment_code`),
  INDEX `erpsettlement_status_receivable_date` (`status`, `receivable_date`)
) CHARSET utf8mb4 COLLATE utf8mb4_bin;
-- Create "erp_stock_balances" table
CREATE TABLE `erp_stock_balances` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `product_code` varchar(128) NOT NULL,
  `warehouse_id` bigint NOT NULL,
  `location_id` bigint NOT NULL,
  `lot_no` varchar(64) NOT NULL DEFAULT "",
  `available_qty` decimal(20,6) NOT NULL DEFAULT 0.000000,
  `locked_qty` decimal(20,6) NOT NULL DEFAULT 0.000000,
  `version` bigint NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL,
  `updated_at` timestamp NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `erpstockbalance_product_code` (`product_code`),
  UNIQUE INDEX `erpstockbalance_product_code_warehouse_id_location_id_lot_no` (`product_code`, `warehouse_id`, `location_id`, `lot_no`),
  INDEX `erpstockbalance_warehouse_id_location_id` (`warehouse_id`, `location_id`)
) CHARSET utf8mb4 COLLATE utf8mb4_bin;
-- Create "erp_stock_transactions" table
CREATE TABLE `erp_stock_transactions` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `biz_type` varchar(32) NOT NULL,
  `biz_code` varchar(128) NOT NULL,
  `biz_line_no` bigint NOT NULL DEFAULT 0,
  `product_code` varchar(128) NOT NULL,
  `warehouse_id` bigint NOT NULL,
  `location_id` bigint NOT NULL,
  `lot_no` varchar(64) NOT NULL DEFAULT "",
  `delta_qty` decimal(20,6) NOT NULL,
  `before_available_qty` decimal(20,6) NOT NULL DEFAULT 0.000000,
  `after_available_qty` decimal(20,6) NOT NULL DEFAULT 0.000000,
  `operator_admin_id` bigint NULL,
  `occurred_at` timestamp NOT NULL,
  `created_at` timestamp NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `erpstocktransaction_biz_type_biz_code_biz_line_no` (`biz_type`, `biz_code`, `biz_line_no`),
  INDEX `erpstocktransaction_occurred_at` (`occurred_at`),
  INDEX `erpstocktransaction_product_code_warehouse_id_location_id` (`product_code`, `warehouse_id`, `location_id`)
) CHARSET utf8mb4 COLLATE utf8mb4_bin;
-- Create "erp_warehouses" table
CREATE TABLE `erp_warehouses` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `code` varchar(64) NOT NULL,
  `name` varchar(128) NOT NULL,
  `disabled` bool NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL,
  `updated_at` timestamp NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `erpwarehouse_code` (`code`),
  INDEX `erpwarehouse_name` (`name`)
) CHARSET utf8mb4 COLLATE utf8mb4_bin;
-- Create "erp_workflow_action_logs" table
CREATE TABLE `erp_workflow_action_logs` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `workflow_instance_id` bigint NOT NULL,
  `workflow_task_id` bigint NULL,
  `action` varchar(32) NOT NULL,
  `from_status` varchar(32) NULL,
  `to_status` varchar(32) NULL,
  `operator_admin_id` bigint NULL,
  `remark` varchar(512) NULL,
  `created_at` timestamp NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `erpworkflowactionlog_operator_admin_id` (`operator_admin_id`),
  INDEX `erpworkflowactionlog_workflow_instance_id_created_at` (`workflow_instance_id`, `created_at`)
) CHARSET utf8mb4 COLLATE utf8mb4_bin;
-- Create "erp_workflow_instances" table
CREATE TABLE `erp_workflow_instances` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `biz_module` varchar(64) NOT NULL,
  `biz_code` varchar(128) NOT NULL,
  `current_status` varchar(32) NOT NULL DEFAULT "draft",
  `starter_admin_id` bigint NULL,
  `submitted_at` timestamp NULL,
  `finished_at` timestamp NULL,
  `created_at` timestamp NOT NULL,
  `updated_at` timestamp NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `erpworkflowinstance_biz_module_biz_code` (`biz_module`, `biz_code`),
  INDEX `erpworkflowinstance_current_status` (`current_status`)
) CHARSET utf8mb4 COLLATE utf8mb4_bin;
-- Create "erp_workflow_tasks" table
CREATE TABLE `erp_workflow_tasks` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `workflow_instance_id` bigint NOT NULL,
  `node_name` varchar(64) NOT NULL,
  `node_order` bigint NOT NULL DEFAULT 0,
  `assignee_admin_id` bigint NULL,
  `decision` varchar(32) NOT NULL DEFAULT "pending",
  `comment` varchar(512) NULL,
  `acted_at` timestamp NULL,
  `created_at` timestamp NOT NULL,
  `updated_at` timestamp NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `erpworkflowtask_assignee_admin_id_decision` (`assignee_admin_id`, `decision`),
  UNIQUE INDEX `erpworkflowtask_workflow_instance_id_node_order` (`workflow_instance_id`, `node_order`)
) CHARSET utf8mb4 COLLATE utf8mb4_bin;
