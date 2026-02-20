## 2026-02-20
- 完成：修复 `/Users/simon/projects/trade-erp/web/tailwind.config.js` 的 `global-require` 告警，将插件 `require()` 从 `plugins` 数组内移动到文件顶部常量声明。
- 验证：`pnpm exec eslint tailwind.config.js` 通过。
- 下一步：后续新增 Tailwind 插件沿用顶部常量引用写法，避免再次触发 `global-require`。
- 阻塞/风险：无。

## 2026-02-20
- 完成：将根目录 `README.md` 规范为统一同构结构（项目简介、目录结构、快速开始、质量命令、门禁、文档索引、数据库迁移约束），与同目录模板仓库保持一致骨架。
- 完成：保留 ERP 项目差异内容（业务专题文档、迁移命令细节）并按统一章节归位。
- 下一步：后续新增文档时，保持三个仓库根 README 章节结构不变，仅维护各自差异内容。
- 阻塞/风险：无。

## 2026-02-20
- 完成：按统一规范重写根目录 `README.md`（项目简介、目录结构、快速开始、质量命令、门禁说明、文档索引），并补齐 `web/README.md` 与 `server/README.md` 结构化说明。
- 完成：修正此前 `server/README.md` 代码块围栏不闭合问题，当前 Markdown 结构可正常渲染。
- 下一步：后续新增命令或文档时，先更新对应目录 README，再同步根 README 索引。
- 阻塞/风险：无。

## 2026-02-19
- 完成：按目录就近原则，将脚本文档从 `/Users/simon/projects/trade-erp/docs/qa-scripts.md` 调整为 `/Users/simon/projects/trade-erp/scripts/README.md`，与仓库内“文档跟模块目录走”的习惯保持一致。
- 完成：同步更新 `README.md` 中脚本文档入口链接，避免路径失效。
- 下一步：后续脚本行为变更优先维护 `scripts/README.md`，并保持三个仓库同构。
- 阻塞/风险：无。

## 2026-02-19
- 完成：为 6 项本地质量脚本补充统一可读文档 `/Users/simon/projects/trade-erp/docs/qa-scripts.md`，覆盖作用、执行时机、环境变量、失败处理与 hook 映射。
- 完成：6 项脚本增加 `-h/--help` 说明，支持终端快速查看用途与参数，降低脚本心智负担。
- 完成：`README.md` 补充 `docs/qa-scripts.md` 入口，避免脚本说明散落。
- 下一步：如后续脚本行为变更，先更新 `docs/qa-scripts.md` 再改脚本，保持文档与实现一致。
- 阻塞/风险：无。

## 2026-02-19
- 完成：同步完善三仓库（`trade-erp`、`collision-simulator`、`webapp-template`）README 的本地质量门禁说明，明确 6 项脚本入口（`bootstrap/db-guard/secrets/fast/full/commit-msg`）与“增量 + 全量”执行策略。
- 完成：在三仓库分别实跑 6 项脚本（本次 `bootstrap` 使用 `BOOTSTRAP_SKIP_INSTALL=1`），`scripts/qa/full.sh` 与 `scripts/git-hooks/commit-msg.sh` 均通过。
- 下一步：后续新增规范或脚本时，保持三仓库同批次同步与回归执行，避免模板漂移。
- 阻塞/风险：`secrets.sh` 依赖 `gitleaks`，未安装时仅提示不阻断；如需强制阻断可启用 `SECRETS_STRICT=1`。

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
