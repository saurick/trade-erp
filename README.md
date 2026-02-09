# trade-erp

基于 `webapp-template` 迁移的外销 ERP 管理后台（一期预需求落地版）。

## 目录结构

- `web/`：Ant Design 管理后台（当前实现重点）
- `server/`：Go Kratos + Ent 后端骨架
- `docs/`：需求映射与阶段清单

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

## 一期预需求实现

详见：`/Users/simon/projects/trade-erp/docs/erp-phase1-requirements.md`

## 数据库迁移约束

`server` 已采用 Ent + Atlas 工作流：

- 禁止手写 SQL
- 使用 `make data` 生成迁移
- 迁移文件纳入版本管理

参考：`/Users/simon/projects/trade-erp/server/internal/data/AI_DB_WORKFLOW.md`
