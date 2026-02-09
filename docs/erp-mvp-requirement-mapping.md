# ERP MVP 需求映射（2026-02-09）

## 输入来源

- `/Users/simon/Downloads/外销erp/ExportSalesOpsSystem_Requirements_v2.md`
- 附件（合同、模板、流程文档）用于后续字段细化与模板对齐

## 模块映射

| 原始模块 | 当前路由 | MVP实现内容 |
|---|---|---|
| 客户/供应商 | `/master/partners` | 建档、自动编码、付款周期字段 |
| 产品 | `/master/products` | 产品编码、海关编码、规格、中英文描述 |
| 报价单（可选） | `/sales/quotations` | 报价明细录入、状态箱流转 |
| 外销 | `/sales/export` | 合同字段、审批流转 |
| 采购（采购合同） | `/purchase/contracts` | 采购合同录入、固定模板输出入口 |
| 入库通知/检验/入库 | `/warehouse/inbound` | 入库通知、质检状态、货位与附件字段 |
| 库存 | `/warehouse/inventory` | 单仓+货位库存台账 |
| 出运明细 | `/shipping/details` | 发票号、起运地/目的地、审批流转 |
| 出库 | `/warehouse/outbound` | 出库记录、免批 |
| 结汇 | `/finance/settlements` | 付款周期自动计算应收日期 |
| 水单→招领→认领确认 | `/finance/bank-receipts` | 招领箱到确认箱流转 |
| 打印输出 | `/docs/print-center` | 报价单/PI/采购合同/商业发票/装箱单/送货单 |

## 当前范围说明

- 已完成：前端管理后台结构、菜单、模块页面、状态箱、打印模板中心、基础单测
- 未完成：真实后端 API 对接、权限体系、数据库实体扩展、导入导出

## 后续建议（按优先级）

1. 先做后端领域建模与 API 对齐（客户、产品、外销、库存四个核心域）
2. 再接入打印模板变量映射（对齐现有 xls 模板字段）
3. 最后补审批流、审计日志与可观测性指标
