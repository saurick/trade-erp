# trade-erp

## 项目简介

外销 ERP 管理后台项目（基于 `webapp-template` 演进），包含前端管理台与 Go Kratos 后端。

## 目录结构

- `web/`：前端管理后台（Vite + React）
- `server/`：后端服务（Kratos + Ent + Atlas）
- `scripts/`：本地质量门禁与 Git hooks 脚本
- `docs/`：ERP 业务与方案文档

## 快速开始

### 1) 启动前端

```bash
cd /Users/simon/projects/trade-erp/web
pnpm install
pnpm start
```

默认地址：`http://localhost:5173`

### 2) 启动后端

```bash
cd /Users/simon/projects/trade-erp/server
make init
make run
```

### 3) 数据迁移（Ent + Atlas）

```bash
cd /Users/simon/projects/trade-erp/server
make data
make migrate_apply
make db_schema_check
```

- 默认从 `server/configs/dev/config.yaml` 解析数据库连接。
- 如需强制使用环境变量：`USE_ENV_DB_URL=1 make migrate_apply`。

## 常用质量命令

```bash
# 环境体检（依赖/版本/hooks）
bash /Users/simon/projects/trade-erp/scripts/doctor.sh

# 开发期快速检查
bash /Users/simon/projects/trade-erp/scripts/qa/fast.sh

# 提交前全量检查
bash /Users/simon/projects/trade-erp/scripts/qa/full.sh

# 发版前严格检查（warning 也阻断）
bash /Users/simon/projects/trade-erp/scripts/qa/strict.sh

# 首次启用本地 hooks
bash /Users/simon/projects/trade-erp/scripts/setup-git-hooks.sh
```

## 本地质量门禁（无 CI）

- `pre-commit`：增量 `Prettier + ESLint --fix`，并执行 `gitleaks + shellcheck + go vet + golangci-lint + yamllint`（Go/YAML 按改动触发，golangci-lint 仅拦截新增问题）
- `pre-push`：先执行 `scripts/qa/shellcheck.sh`（严格）再执行 `SECRETS_STRICT=1 scripts/qa/full.sh`
- `commit-msg`：校验提交信息（Conventional Commits）

质量脚本详细说明见：`/Users/simon/projects/trade-erp/scripts/README.md`

## 文档索引

### 根目录文档

- 协作约定：`/Users/simon/projects/trade-erp/AGENTS.md`
- 进度记录：`/Users/simon/projects/trade-erp/progress.md`

### 子目录文档

- 脚本说明：`/Users/simon/projects/trade-erp/scripts/README.md`
- 后端说明：`/Users/simon/projects/trade-erp/server/README.md`
- 前端说明：`/Users/simon/projects/trade-erp/web/README.md`

### 专题文档

- `/Users/simon/projects/trade-erp/docs/erp-phase1-requirements.md`
- `/Users/simon/projects/trade-erp/docs/erp-auth-permission-api.md`
- `/Users/simon/projects/trade-erp/docs/erp-module-implementation-check-20260210.md`
- `/Users/simon/projects/trade-erp/docs/erp-longterm-schema-plan-20260211.md`
- `/Users/simon/projects/trade-erp/docs/erp-module-records-assessment-20260211.md`
- `/Users/simon/projects/trade-erp/docs/erp-testdata.md`

## 数据库迁移约束

`server` 使用 Ent + Atlas 工作流：

- 禁止手写 SQL
- 必须通过 `make data` 生成迁移
- 迁移文件需纳入版本管理

流程详见：`/Users/simon/projects/trade-erp/server/internal/data/AI_DB_WORKFLOW.md`
