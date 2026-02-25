## 2026-02-25
- 完成：打印弹窗工具栏新增“服务器预览PDF”“下载PDF”按钮，支持将当前编辑后的模板 DOM 提交给服务端渲染并预览/下载（`web/src/erp/data/printTemplates.js`）。
- 完成：后端新增 `POST /templates/render-pdf` 接口，管理员鉴权后使用 Headless Chromium 统一渲染 PDF；支持 `base_url` 资源基址注入与文件名兜底清洗（`server/internal/server/template_pdf.go`）。
- 完成：修复模板/文件 HTTP 路由在管理员鉴权上的误判问题，`isAdmin` 判断由“仅 context claims”改为“context 优先 + Authorization JWT 兜底校验”，并新增单测覆盖 admin/user token 分支（`server/internal/server/file_handlers.go`、`server/internal/server/file_handlers_auth_test.go`）。
- 完成：修复服务器 PDF 与前端预览差异：前端改为传入主窗口 `base_url`、快照阶段尽量内联图片，后端渲染显式启用 `print media` 并增加短暂资源加载等待，降低缺图和样式偏差（`web/src/erp/data/printTemplates.js`、`server/internal/server/template_pdf.go`）。
- 完成：修复服务器 PDF 页面偏左问题：快照生成阶段新增“服务器 PDF 专用布局覆盖”（强制 A4 竖版、清理预览态动态样式、纸张容器居中），减少右侧异常留白（`web/src/erp/data/printTemplates.js`）。
- 完成：进一步固定服务端 `printToPDF` 纸张参数（A4 竖版 + scale=1 + 零边距，关闭 `preferCSSPageSize` 自适配），降低不同内核下横向偏移导致的左右留白不对称（`server/internal/server/template_pdf.go`）。
- 完成：针对开票信息固定坐标模板补充服务器快照居中规则（`billing-info-canvas` 固定 595x842 并水平居中），修正服务端 PDF 右侧异常留白过大问题（`web/src/erp/data/printTemplates.js`）。
- 完成：定位并修复开票信息模板服务端 PDF 右侧留白过大根因（72/96 DPI 比例差）：前端请求新增 `template_key`，服务端按模板 key 动态设置 `printToPDF` 缩放（`billingInfo` 使用 `4/3`），其余模板维持 `1.0`（`web/src/erp/data/printTemplates.js`、`server/internal/server/template_pdf.go`）。
- 完成：开发环境代理新增 `/templates/render-pdf` 转发；接口文档补充新端点说明（`web/vite.config.mjs`、`docs/erp-auth-permission-api.md`）。
- 验证：`cd server && go test ./...`；`cd web && pnpm exec eslint src/erp/data/printTemplates.js vite.config.mjs`；`cd web && pnpm test -- src/erp/data/printTemplates.test.js` 均通过。
- 下一步：在部署环境安装/配置 Chrome 可执行文件；若默认路径不可用，可通过 `ERP_PDF_CHROME_PATH` 显式指定。
- 阻塞/风险：若服务器运行环境缺少 Chromium，`/templates/render-pdf` 会返回“服务器生成 PDF 失败”。

## 2026-02-25
- 完成：外销形式发票（PI）模板抽离为可复用模块 `web/src/erp/data/proformaInvoiceTemplate.mjs`，并在打印编辑器中复用字段映射与模板渲染（`web/src/erp/data/printTemplates.js`）。
- 完成：修复 PI 固定版式的边线重叠/多画问题：去除 meta 区域左右竖线、避免签字区出现双竖线，使外框竖线仅在“货品/条款表格段”出现，贴近参考 PDF（`web/src/erp/data/proformaInvoiceTemplate.mjs`）。
- 完成：新增 PI 像素级对比脚本（渲染参考 PDF + 截图当前模板 + 生成 diff）：`web/scripts/pi-pixel-diff.mjs`，并接入 `pnpm pi:pixel-diff` 使用入口与文档（`web/package.json`、`web/README.md`）。
- 完成：补充单测断言，确保 PI 固定版式包含 `proforma-meta-box` 等关键结构（`web/src/erp/data/printTemplates.test.js`）。
- 验证：`cd web && pnpm test` 通过；`pnpm pi:pixel-diff -- --ref /Users/simon/Downloads/外销形式发票模版.pdf` 可生成 `ref/current/diff` PNG。
- 下一步：确认“签字章区”最终是保持图片（更贴近 PDF）还是维持可编辑文字；如需更聚焦线条差异，可在 diff 脚本内默认 mask 该区域。
- 阻塞/风险：像素 diff 脚本目前依赖 macOS `qlmanage` + `npx`（首次运行会拉取 `@playwright/cli`）；非 mac 环境需补充渲染实现或改用 Poppler。

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

## 2026-02-25
- 完成：PI 打印编辑器改为单一样式源，移除 `printTemplates.js` 中遗留的整段旧版 PI 样式，避免与 `proformaInvoiceTemplate.mjs` 双重覆盖导致的字体/线条冲突。
- 完成：关闭 PI 预览区按高度强制缩放逻辑（保留滚动浏览），避免页面内模板被压缩后出现“字体偏小、间距异常”的观感偏差。
- 完成：卖方签字章区改为图片渲染（`web/public/templates/proforma-signature.png`），并在 `pi-pixel-diff` 脚本中补齐签章图 dataURL 注入，保证对比截图与实际模板素材一致。
- 完成：清理本地打印态里 PI 的强制小字号规则与自动行高规则，减少打印/导出时的线条重叠与文字挤压。
- 验证：`cd /Users/simon/projects/trade-erp/web && pnpm test` 通过（21/21）；`pnpm pi:pixel-diff -- --ref /Users/simon/Downloads/外销形式发票模版.pdf --out /Users/simon/projects/trade-erp/output/pi-pixel-diff-fix2 --browser chrome` 已输出差异图。
- 下一步：在你的真实“形式发票 PI 编辑器页面”再做一轮截图复核（重点看顶部字号、表格线闭合、签章位置）；若仍有偏差，再按区块做 2-3 组定点微调。
- 阻塞/风险：像素差异目前仍未到理想阈值（ignoreAA 约 14 万），主要来自历史文本坐标与参考模板字体族差异，需继续小步调参收敛。

## 2026-02-25
- 完成：修复打印模板中心“开票信息”按钮误禁用问题（`web/src/erp/pages/PrintCenterPage.jsx`）：切换模板时主动 `ensureModuleLoaded` 拉取对应模块记录，不再仅依赖路由预取。
- 完成：记录可打印判定改为“存在可用记录对象”而非强依赖 `id` 字段，减少数据形态差异导致的误判；新增工具函数与单测（`web/src/erp/utils/printCenterRecord.js`、`web/src/erp/utils/printCenterRecord.test.js`）。
- 验证：`cd /Users/simon/projects/trade-erp/web && pnpm test -- src/erp/utils/printCenterRecord.test.js` 通过（同时全量跑过现有 6 个测试文件）；`pnpm exec eslint --no-warn-ignored src/erp/pages/PrintCenterPage.jsx` 与 `pnpm exec eslint src/erp/utils/printCenterRecord.js src/erp/utils/printCenterRecord.test.js` 通过。
- 下一步：请在“打印模板中心 -> 开票信息”页面刷新后验证按钮状态；若仍禁用，抓一条 `erp.list`（`module_key=partners`）响应给我，我直接按接口返回继续收敛。
- 阻塞/风险：若后端在当前账号下返回 `partners` 空数组或权限错误，按钮仍会保持禁用（这是预期保护）。
