# trade-erp

基于 `webapp-template` 迁移的外销 ERP 管理后台（MVP）。

## 目录结构

- `web/`：Ant Design 管理后台（本次重点）
- `server/`：Go Kratos + Ent 后端骨架（从模板迁移）
- `docs/`：需求映射与实施说明

## 快速开始

### 1) 启动前端后台

```bash
cd /Users/simon/projects/trade-erp/web
pnpm install
pnpm start
```

默认地址：`http://localhost:5173`

### 2) 前端测试

```bash
cd /Users/simon/projects/trade-erp/web
pnpm test
```

### 3) 后端（可选）

```bash
cd /Users/simon/projects/trade-erp/server
make init
make run
```

## 已实现模块（MVP）

- 客户/供应商
- 产品
- 报价单（可选）
- 外销
- 采购（采购合同）
- 入库通知/检验/入库
- 库存
- 出运明细
- 出库
- 结汇（支持按付款周期自动计算应收日期）
- 水单 → 招领 → 认领确认
- 打印模板中心（报价单、PI、采购合同、商业发票、装箱单、送货单）

## 状态箱机制

支持以下状态箱及流转：

- 草稿箱
- 待批箱
- 已批箱
- 招领箱
- 确认箱
- 免批

## 数据与后端说明

当前为前端可运行 MVP，页面使用内置 mock 数据（便于先确认流程与模板）。
后续可直接对接 `server/` API 与数据库模型。

## 数据库迁移约束

`server` 已采用 Ent + Atlas 工作流，遵循以下规范：

- 禁止手写 SQL
- 使用 `make data` 生成迁移
- 迁移文件纳入版本管理

参考：`/Users/simon/projects/trade-erp/server/internal/data/AI_DB_WORKFLOW.md`
