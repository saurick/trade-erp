# ERP 需求映射（2026-02-10）

## 输入来源

- `/Users/simon/Downloads/外销erp/ExportSalesOpsSystem_Requirements_v2.md`
- `/Users/simon/Downloads/外销erp/ExportSalesOpsSystem_Detail_v2.xlsx`
- `/Users/simon/Downloads/外销erp/操作系统流程.docx`
- `/Users/simon/Downloads/外销erp/ERP销售部分操作流程简介2021-2-27.doc`

## 模块映射

| 原始模块 | 当前路由 | 状态 |
|---|---|---|
| 客户/供应商 | `/master/partners` | 已实现 |
| 产品 | `/master/products` | 已实现 |
| 报价单（可选） | `/sales/quotations` | 已实现 |
| 外销 | `/sales/export` | 已实现 |
| 采购（采购合同） | `/purchase/contracts` | 已实现 |
| 入库通知/检验/入库 | `/warehouse/inbound` | 已实现 |
| 库存 | `/warehouse/inventory` | 已实现 |
| 出运明细 | `/shipping/details` | 已实现 |
| 出库 | `/warehouse/outbound` | 已实现 |
| 结汇 | `/finance/settlements` | 已实现 |
| 水单→招领→认领确认 | `/finance/bank-receipts` | 已实现 |
| 打印输出 | `/docs/print-center` | 已实现 |
| 登录页 | `/admin-login` | 已实现 |
| 权限管理（菜单显示） | `/system/permissions` | 已实现 |

## 说明

- 第一阶段为前端可运行版本，已覆盖流程、字段、状态箱及模板打印。
- 已补充后端管理员菜单权限接口与 `admin_users.menu_permissions` 字段。
- 已补充后端 ERP 统一 CRUD 接口与 `erp_module_records` 持久化表。
- 已补充后端 ERP 模块级规则校验（模块白名单、必填字段、数值范围、状态箱合法值）。
- 已补充后端关键派生字段计算（`totalAmount`、`totalPackages`、`receivableDate`）。
- 前端模块列表仅展示后端真实数据，已移除演示 seed 数据。
- 已补充模板上传与可编辑打印能力（Excel 模板单元格可编辑后打印）。
- 已补充开票信息模板（来源 `杭州科森磁材开票信息.pdf`）并接入打印中心。
- 已将外销形式发票 PI 切换为固定版式（1:1）模板渲染，避免 Excel 自动解析带来的样式偏差。
- 已补充附件上传接口（`/files/upload`）与访问路径（`/files/...`）。
- 已启用 HTTP tracing middleware，并补充 `request_id`、`latency_ms` 访问日志字段。
- 下一阶段建议补齐导入导出能力。
