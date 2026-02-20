## 2026-02-20
- 完成：落地最小侵入基线策略：`pre-commit` 的 Go 检查改为“仅改动包 + `golangci-lint` 仅新增问题（`--new-from-rev HEAD`）”；YAML 检查改为“默认仅变更文件，`YAMLLINT_ALL=1` 才全量”。
- 完成：新增并启用根目录 `.yamllint`（降噪规则 + 忽略锁文件/生成目录），并同步更新 `scripts/README.md` 与根 `README.md` 的门禁说明。
- 验证：三仓库执行 `go-vet`、`golangci-lint`、`yamllint` 与 `scripts/git-hooks/pre-commit.sh` 均通过，`doctor` 显示依赖与脚本检查全部通过。
- 下一步：若要治理历史存量问题，可在不影响当前门禁的前提下分批执行 `YAMLLINT_ALL=1` 与 `GOLANGCI_ONLY_NEW=0` 清理。
- 阻塞/风险：无。

## 2026-02-20
- 完成：接入 pre-commit 五项门禁（`gitleaks`、`shellcheck`、`go vet`、`golangci-lint`、`yamllint`），并按“增量优先”策略实现（Web 仅暂存文件、Go 仅有 Go 变更触发、YAML 仅暂存 YAML 触发）。
- 完成：新增 `scripts/qa/go-vet.sh`、`scripts/qa/golangci-lint.sh`、`scripts/qa/yamllint.sh`，并同步更新 `scripts/git-hooks/pre-commit.sh`、`scripts/qa/secrets.sh`、`scripts/doctor.sh`、`scripts/setup-git-hooks.sh` 与 README 文档。
- 验证：三个仓库均执行新增脚本；`go-vet` 通过，`golangci-lint` 与 `yamllint` 在现有历史代码/配置基线上报出问题（符合预期，未做历史问题清理）。
- 下一步：如需让 pre-commit 在现状下可顺畅通过，需要先清理历史 `golangci-lint`/`yamllint` 存量问题或按仓库基线配置忽略策略。
- 阻塞/风险：当前若提交涉及 Go/YAML 改动，pre-commit 可能被历史问题阻断。

## 2026-02-20
- 完成：移除 ERP 顶部标题区域中的 `Phase 1` 标签，保留系统名称与管理员角色信息展示（`web/src/erp/components/ERPLayout.jsx`）。
- 验证：执行 `pnpm --dir /Users/simon/projects/trade-erp/web lint` 通过。
- 下一步：无。
- 阻塞/风险：无。

## 2026-02-20
- 完成：将 `scripts/git-hooks/pre-push.sh` 调整为更严格模式：先执行 `scripts/qa/shellcheck.sh`（`SHELLCHECK_STRICT=1`）再执行 `scripts/qa/full.sh`（`SECRETS_STRICT=1`）。
- 完成：同步更新 `README.md` 与 `scripts/README.md` 的 pre-push 说明，确保文档与实际门禁策略一致。
- 验证：执行 `bash scripts/git-hooks/pre-push.sh` 通过，且 `qa:shellcheck`、`qa:secrets` 均按阻断模式执行。
- 下一步：继续保持“日常走 full、发版前走 strict”的执行节奏。
- 阻塞/风险：无。

## 2026-02-20
- 完成：修复 `web` 三类非阻断告警：将 Vite 配置迁移为 ESM（`web/vite.config.mjs`）以消除 CJS Node API 弃用提示；新增 `baseline-browser-mapping` 最新版本；优化 `manualChunks` 并按 ERP 依赖体量调整 `chunkSizeWarningLimit`。
- 验证：执行 `pnpm --dir /Users/simon/projects/trade-erp/web test && pnpm --dir /Users/simon/projects/trade-erp/web build`，当前不再出现 Vite CJS 提示、baseline 过期提示与 chunk>500k 告警。
- 下一步：如需进一步压缩首屏包体，可继续把大模块（如 `antd`）按页面做动态导入。
- 阻塞/风险：`antd` 产物仍接近 1MB（已低于当前告警阈值），后续可结合路由级拆包继续优化。

## 2026-02-20
- 完成：删除 `scripts/sync-quality.sh` 与 `scripts/sync-targets.txt.example`，避免对外交付代码时暴露跨仓库同步上下文。
- 完成：清理 `README.md`、`scripts/README.md`、`scripts/setup-git-hooks.sh` 中与该脚本相关的命令入口和说明。
- 下一步：无。
- 阻塞/风险：无。

## 2026-02-20
- 完成：修复 `scripts/doctor.sh` 的 Node 版本提示变量展开边界问题，将提示行变量改为 `${...}` 显式包裹，避免在特定 shell/locale 下触发 `unbound variable`。
- 验证：构造版本不一致场景执行 `doctor.sh`，现可正常输出提示且不报错。
- 下一步：无。
- 阻塞/风险：无。

## 2026-02-20
- 完成：`scripts/sync-quality.sh` 通用化改造（不再写死仓库名，支持 `--apply`、`--all-siblings`、`scripts/sync-targets*.txt` 清单，默认 dry-run）。
- 完成：新增 `scripts/sync-targets.txt.example`，并在 `README`/`scripts/README` 补充用法说明；脚本改为 Bash 3 兼容实现。
- 下一步：如需长期固定目标，可在本地维护 `scripts/sync-targets.local.txt`。
- 阻塞/风险：无。

## 2026-02-20
- 完成：按 `n` 使用习惯将版本锁定切换为 `.n-node-version`（移除 `.nvmrc`），并调整 `doctor`/脚本文档说明为 `n auto` 工作流。
- 完成：`scripts/doctor.sh` 改为按优先级读取 `.n-node-version`、`.node-version`、`.nvmrc` 进行 Node 版本提示。
- 下一步：本地执行 `n auto` 后再跑 QA 脚本，保持 Node 版本一致。
- 阻塞/风险：无。

## 2026-02-20
- 完成：新增本地质量脚本 `scripts/doctor.sh`、`scripts/qa/strict.sh`、`scripts/qa/shellcheck.sh`、`scripts/sync-quality.sh`，并新增 `.nvmrc`（Node 版本锁定）。
- 完成：更新 `scripts/setup-git-hooks.sh`，纳入新增脚本可执行权限；更新 `scripts/README.md` 与根 `README.md` 使用说明。
- 验证：执行脚本语法检查、`doctor` 检查、`--help` 与 `sync-quality --dry-run` 冒烟通过。
- 下一步：如需启用强安全策略，可安装 `gitleaks/shellcheck` 并在关键流程启用 `strict`。
- 阻塞/风险：当前环境未安装 `gitleaks` 与 `shellcheck`，对应检查为提示模式。

## 2026-02-20
- 完成：删除 `/Users/simon/projects/trade-erp/web/link_node_modules.sh`，该脚本已不再使用。
- 下一步：无。
- 阻塞/风险：无。

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

## 2026-02-20
- 完成：三仓库 pre-commit 接入 `gitleaks`、`shellcheck`、`go vet`、`golangci-lint`、`yamllint`，默认采用“增量/新增问题拦截”策略以兼容历史基线。
- 完成：本仓库已回归执行 `scripts/doctor.sh`、`scripts/git-hooks/pre-commit.sh`、`scripts/qa/go-vet.sh`、`scripts/qa/golangci-lint.sh`、`scripts/qa/yamllint.sh`，当前通过。
- 下一步：后续逐步清理历史告警后，将 `golangci-lint` 与 `yamllint` 切换到全量阻断模式。
- 阻塞/风险：无。

## 2026-02-20
- 完成：新增 `scripts/qa/shfmt.sh` 与 `scripts/qa/govulncheck.sh`，并接入到三处流程：`pre-commit`（staged shell 自动 `shfmt`）、`full`（govulncheck 提示模式）、`strict`（`shfmt` 检查模式 + `govulncheck` 阻断模式）。
- 完成：更新 `scripts/doctor.sh`、`scripts/setup-git-hooks.sh`、`scripts/README.md`、根 `README.md`，同步补齐工具说明与门禁行为。
- 验证：已安装 `shfmt v3.12.0`、`govulncheck v1.1.4`；执行 `scripts/qa/shfmt.sh`、`scripts/qa/govulncheck.sh`、`scripts/doctor.sh`、`scripts/git-hooks/pre-push.sh` 通过。
- 验证：`scripts/qa/strict.sh` 当前被历史漏洞基线拦截（`go.opentelemetry.io/otel/sdk@v1.38.0` -> `>=v1.40.0`，`github.com/golang-jwt/jwt/v5@v5.1.0` -> `>=v5.2.2`）。
- 下一步：按目录分批修复并升级上述依赖版本，清理后再把 `strict` 设为日常阻断。
- 阻塞/风险：严格模式暂不可全绿，阻塞点为既有依赖漏洞基线。

## 2026-02-20
- 完成：修复 `govulncheck` 阻断基线，升级 `server/go.mod` 依赖：`go.opentelemetry.io/otel/sdk` 到 `v1.40.0`、`github.com/golang-jwt/jwt/v5` 到 `v5.2.2`（并同步相关 OTel 子模块版本）。
- 验证：`bash scripts/qa/strict.sh` 已全通过；`bash scripts/git-hooks/pre-push.sh` 已全通过。
- 下一步：继续按目录分批清理历史质量问题，优先做与业务改动同目录的小批次。
- 阻塞/风险：无。

## 2026-02-20
- 完成：按三仓库同步审计结果统一根级 `.gitignore`（补充 `output/`、`.playwright-cli/`），与现有脚本产物忽略策略保持一致。
- 下一步：如后续新增工具缓存目录（如 coverage/sbom 报告目录），继续三仓库同批补充忽略规则。
- 阻塞/风险：无。
