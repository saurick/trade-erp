## 2026-02-19
- 完成：按要求执行“三仓库统一提交推送”，补充并纳入 `AGENTS.md` 协作约定文件，保证本仓库与同目录项目协作规则一致。
- 下一步：继续按本地 hooks 与协作约定进行开发与提交。
- 阻塞/风险：无。

## 2026-02-19
- 完成：执行并修复前端质量检查，已完成 `web` 全量 `eslint`、`prettier`，修复 `no-void`/`eqeqeq`/`no-alert` 问题，当前 `pnpm lint` 通过。
- 完成：新增本地 Git hooks（无 CI 场景）：`pre-commit` 对暂存文件执行 `prettier` 与 `eslint --fix`，`pre-push` 执行 `web` 与 `server` 全量检查；新增一键安装脚本并在 README 补充使用说明。
- 完成：执行 `bash /Users/simon/projects/trade-erp/scripts/git-hooks/pre-push.sh`，当前全量门禁通过（`web lint/css/test/build`、`server go test/make build`）。
- 下一步：继续按当前 hooks 流程开发；后续若引入 CI，可直接复用 `pre-push` 的检查命令作为流水线基础。
- 阻塞/风险：`web` 构建仍有 chunk 体积告警与依赖基线数据过期提示（不阻塞本次提交）。

## 2026-02-15
- 完成：同步部署稳定性与迁移友好逻辑：配置改为服务名互联、compose 增加 MySQL healthcheck + depends_on 条件、增加 `.env.example`、文档补充迁移步骤（`server/configs/*`、`server/deploy/compose/prod/*`）。
- 完成：数据层新增 MySQL 启动重试窗口与单测，降低宿主机重启后数据库短暂未就绪导致的启动失败（`server/internal/data/data.go`、`server/internal/data/data_ping_retry_test.go`）。
- 下一步：部署前按目标机器复制 `.env.example` 为 `.env` 并校准路径/端口/镜像，再执行 `docker compose up -d`。
- 阻塞/风险：仓库存在大量既有前端未提交改动（与本次同步无关）；提交时需严格按文件范围选择，避免混入。
