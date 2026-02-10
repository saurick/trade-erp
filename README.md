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

### 3.1) 数据迁移与字段校验

```bash
cd /Users/simon/projects/trade-erp/server
make data
make migrate_apply
make db_schema_check
# 全量校验（包含 M1/可选表）：
go run ./cmd/dbschemacheck -conf ./configs/dev/config.yaml -full
```

- 默认从 `configs/dev/config.yaml` 自动解析数据库连接并执行迁移。
- 若必须使用环境变量 `DB_URL`，请显式加：`USE_ENV_DB_URL=1 make migrate_apply`。

### 4) 管理员登录

- 登录地址：`http://localhost:5173/admin-login`
- 默认超级管理员：读取 `server/configs/dev/config.yaml` 的 `data.auth.admin`
- 进入系统后按菜单权限显示可访问菜单（超级管理员默认全部菜单）
- 前端仅展示后端真实数据，已移除演示/假数据 seed
- 打印模板当前仅保留 3 项：开票信息、外销形式发票 PI、采购合同
- 上述 3 项均为固定版式，左右字段双向同步，右侧文字可编辑；采购合同“其他条款”为整体多行编辑区；固定模板的 logo/水印/示意图锁定，不支持上传覆盖

## 一期预需求实现

详见：`/Users/simon/projects/trade-erp/docs/erp-phase1-requirements.md`

登录与权限接口说明：`/Users/simon/projects/trade-erp/docs/erp-auth-permission-api.md`

全模块核查清单：`/Users/simon/projects/trade-erp/docs/erp-module-implementation-check-20260210.md`

长期表结构方案：`/Users/simon/projects/trade-erp/docs/erp-longterm-schema-plan-20260211.md`

`erp_module_records` 单表评估：`/Users/simon/projects/trade-erp/docs/erp-module-records-assessment-20260211.md`

ERP 联调测试数据说明：`/Users/simon/projects/trade-erp/docs/erp-testdata.md`

## 数据库迁移约束

`server` 已采用 Ent + Atlas 工作流：

- 禁止手写 SQL
- 使用 `make data` 生成迁移
- 迁移文件纳入版本管理

参考：`/Users/simon/projects/trade-erp/server/internal/data/AI_DB_WORKFLOW.md`

## 本次后端补充

- `admin_users` 增加 `menu_permissions` 字段（Ent + Atlas 迁移生成）
- 新增 `erp_module_records` 表，支持 ERP 模块统一 CRUD 持久化
- `admin` JSON-RPC 新增菜单权限接口：`menu_options`、`set_permissions`
- `admin.me/admin.list` 返回 `menu_permissions`
- 新增 `erp` JSON-RPC 域：`list/create/update/delete`
- `erp` 服务端增加模块级规则校验（模块白名单、必填字段、数值范围、状态箱合法值）
- `erp` 服务端统一计算关键派生字段（`totalAmount`、`totalPackages`、`receivableDate`）
- 启用 HTTP tracing middleware，并补充 `request_id`、`latency_ms` 日志字段
- 新增附件上传/读取接口：`POST /files/upload`、`GET /files/...`
- 新增模板上传/读取接口：`POST /templates/upload/{template_key}`、`GET /templates/file/{template_key}`
- 新增 Prometheus 指标端点：`GET /metrics`
