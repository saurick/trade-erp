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

## 说明

- 第一阶段为前端可运行版本，已覆盖流程、字段、状态箱及模板打印。
- 下一阶段建议对接后端 API、权限与文件上传。
