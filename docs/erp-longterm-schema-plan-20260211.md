# ERP 长期表结构方案（2026-02-11）

> 目标：从 `erp_module_records` 通用表逐步过渡到可支撑完整业务闭环的结构化模型。

## 一、设计原则

- 主数据、单据、库存、财务、审批分层建模。
- 关键链路先保证强一致（库存与回款）。
- 新旧并行迁移：保留 `erp_module_records` 作为过渡层与扩展字段层。
- 所有表变更统一通过 Ent Schema + Atlas 迁移生成，禁止手写 SQL。

## 二、已落地表（已建 Ent Schema 并生成迁移）

### 1) 主数据与销售单据基础

- `erp_partners`
- `erp_products`
- `erp_quotations`
- `erp_quotation_items`
- `erp_export_sales`
- `erp_export_sale_items`

### 2) 主数据与仓储

- `erp_warehouses`
- `erp_locations`

### 3) 库存核心

- `erp_stock_balances`：库存余额快照
- `erp_stock_transactions`：库存流水审计

### 4) 财务闭环

- `erp_settlements`：结汇单
- `erp_bank_receipts`：水单登记
- `erp_bank_receipt_claims`：认领/确认明细

### 5) 审批与审计

- `erp_workflow_instances`
- `erp_workflow_tasks`
- `erp_workflow_action_logs`

### 6) 链路与支撑

- `erp_doc_links`：单据来源关系
- `erp_sequences`：业务单号序列
- `erp_attachments`：附件元数据

### 7) 采购与入库

- `erp_purchase_contracts`
- `erp_purchase_contract_items`
- `erp_inbound_notices`
- `erp_inbound_notice_items`

### 8) 出运与出库

- `erp_shipment_details`
- `erp_shipment_detail_items`
- `erp_outbound_orders`
- `erp_outbound_order_items`

## 三、与业务环节对应关系

- 客户/供应商、产品：继续由主数据维护，后续可从通用表迁出。
- 入库/出库：库存变更必须写入 `erp_stock_transactions`，并更新 `erp_stock_balances`。
- 结汇/水单：通过 `erp_settlements` + `erp_bank_receipt_claims` 实现部分认领与尾款闭环。
- 审批箱（草稿/待批/已批/招领/确认/免批）：由 `erp_workflow_*` 与业务状态字段联合驱动。
- 跨模块生成关系（报价->外销->采购->入库->出运->出库->结汇）：记录到 `erp_doc_links`。

## 四、迁移进度（当前）

1. 已完成库存表：`erp_stock_balances`、`erp_stock_transactions`。
2. 已完成财务表：`erp_settlements`、`erp_bank_receipts`、`erp_bank_receipt_claims`。
3. 已完成审批表：`erp_workflow_instances`、`erp_workflow_tasks`、`erp_workflow_action_logs`。
4. 已完成主数据与业务单据拆分建模（报价/外销/采购/入库/出运/出库），下一步是双写切换与数据回填。

## 五、执行命令

在 `server/` 目录执行：

```bash
make data
make migrate_apply
make db_schema_check
# 需要全量校验（M0 + M1 + 可选表）时：
go run ./cmd/dbschemacheck -conf ./configs/dev/config.yaml -full
```

## 六、完整逻辑仍需补齐的点

> 说明：当前核心主数据 + 全业务单据主链已完成结构化建模，剩余工作集中在“业务接线”和“一致性增强”。

### 1) 财务细分（可选但建议）

- `erp_settlement_lines`（结汇分摊到出运行，支持一票多行与部分收汇）

### 2) 约束增强（建议）

- 补充关键外键与级联策略（如单据头/行、仓库/货位、认领/结汇）。
- 对核心状态流转增加数据库层唯一约束或检查约束。

## 七、表数量精简结论（2026-02-11）

为降低复杂度，建议按两层推进而不是一次性全上：

1. M0（必须，12~14 张）
- `erp_partners`、`erp_products`
- `erp_warehouses`、`erp_locations`
- `erp_stock_balances`、`erp_stock_transactions`
- `erp_settlements`、`erp_bank_receipts`、`erp_bank_receipt_claims`
- `erp_workflow_instances`、`erp_workflow_tasks`、`erp_workflow_action_logs`
- `erp_doc_links`、`erp_attachments`（可并入 M1）

2. M1（后续补齐，按单据模块分批）
- `erp_quotations`/`erp_quotation_items`
- `erp_export_sales`/`erp_export_sale_items`
- `erp_purchase_contracts`/`erp_purchase_contract_items`
- `erp_inbound_notices`/`erp_inbound_notice_items`
- `erp_shipment_details`/`erp_shipment_detail_items`
- `erp_outbound_orders`/`erp_outbound_order_items`

## 八、落地顺序（建议）

1. 服务端进入“双写期”：继续写 `erp_module_records`，同时写专表。
2. 增加数据回填与对账任务，校验新旧模型一致性。
3. 验证一致性后切换读路径：优先读专表，`erp_module_records` 仅保留扩展字段与兼容兜底。
4. 更新 `cmd/testdata_erp`：新增专表造数与按 `prefix` 撤销，保留现有 up/down 机制。
