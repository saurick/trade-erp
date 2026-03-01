## 2026-02-28
- 完成：修复 favicon 字母边缘不平滑问题：从 `billing-info-logo.png` 左侧 `KS` 先按颜色分离二值蒙版，再分别用 `potrace` 生成平滑贝塞尔路径，替换 `web/public/favicon.svg` 为纯 path 版。
- 完成：保留原始 `KS` 的相对位置和配色（`#1b3c59`、`#dfac4e`），去除上一版自动追踪导致的抖动轮廓。
- 下一步：浏览器强刷后复核标签页图标；若需更接近原图细节，可继续微调蒙版阈值与 `potrace` 参数。
- 阻塞/风险：不同浏览器抗锯齿策略不同，放大查看时仍可能有轻微显示差异，但边缘已由噪点折线改为平滑曲线。

## 2026-02-28
- 完成：基于 `web/public/templates/billing-info-logo.png` 左侧 `KS` 进行矢量追踪（`autotrace`），生成纯 path 版 `web/public/favicon.svg`，去除字体模拟与 base64 位图嵌入。
- 完成：按 favicon 256x256 画布居中封装 `KS`（保持原始裁切比例与间距），继续保留 `favicon.png` 作为兼容兜底。
- 验证：将新 `favicon.svg` 回渲染后与目标 `KS` 参考图做像素对比（RMSE 最优参数结果已应用）。
- 下一步：浏览器强刷验证标签页显示；若仍需进一步收敛，可继续针对追踪参数或局部 path 做人工微调。
- 阻塞/风险：源素材本身是位图，矢量追踪仍可能存在亚像素级渲染差异（不同浏览器抗锯齿策略不同）。

## 2026-02-28
- 完成：将 `web/public/favicon.svg` 从 base64 位图嵌入改为纯 SVG 元素（`rect + text`），去除 `data:image/png;base64`，满足可编辑矢量格式要求。
- 下一步：浏览器强刷后确认标签页渲染效果；若需更高一致性可进一步将字母转为固定路径。
- 阻塞/风险：当前方案基于系统字体渲染，不同系统可能存在轻微字形差异。

## 2026-02-28
- 完成：修复 favicon 空白问题：`web/public/favicon.svg` 由“外链 PNG”改为“内嵌 data URI 图片”，避免浏览器在 favicon 场景忽略外链资源。
- 完成：新增兼容兜底图标 `web/public/favicon.png`（来源于 `billing-info-logo.png` 左侧 `KS`），并在前端入口增加 fallback 引用（`web/index.html`、`web/public/index.html`）。
- 下一步：浏览器清空站点缓存后再次打开页面，确认标签页图标正常显示。
- 阻塞/风险：若浏览器持久化缓存旧 favicon，可能仍短暂显示旧图或空白，需强刷或关闭重开标签页。

## 2026-02-28
- 完成：按反馈将 `favicon.svg` 改为直接使用 `web/public/templates/billing-info-logo.png` 左侧 `KS` 区域（通过 `viewBox` 裁切），确保字形与间距与原 logo 一致。
- 下一步：浏览器强刷后确认标签页图标清晰度；如需进一步提高清晰度可改为内嵌矢量路径版。
- 阻塞/风险：当前方案在 SVG 中引用 PNG，缩放到极小尺寸时仍受位图清晰度影响。

## 2026-02-28
- 完成：按反馈调整站点图标字母间距，`web/public/favicon.svg` 中 `S` 的横向位置右移，避免 `K` 与 `S` 过近。
- 下一步：浏览器强刷后确认标签页中 `KS` 间距观感；如仍需更松可继续微调 `x` 坐标。
- 阻塞/风险：无。

## 2026-02-28
- 完成：新增站点图标 `web/public/favicon.svg`，使用 `KS` 配色 logo（蓝色 `K` + 金色 `S`）替换旧 PNG 图标。
- 完成：同步更新前端入口 favicon 引用为 SVG（`web/index.html`、`web/public/index.html`）。
- 下一步：启动前端后在浏览器标签页确认新 favicon 显示是否符合预期；如需完全 1:1 还原可再按你提供的矢量稿微调。
- 阻塞/风险：当前 SVG 使用系统粗体字体近似原图，若不同系统字体渲染差异较大，细节可能有轻微偏差。

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

## 2026-02-25
- 完成：PI 预览恢复“整页适配”逻辑，按容器宽高计算缩放比例并居中显示，确保页面一屏展示且不出现滚动条（`web/src/erp/data/printTemplates.js`）。
- 完成：新增 `template-wrap-proforma-fit` 的无滚动样式约束，避免适配态下出现内层滚动（`web/src/erp/data/proformaInvoiceTemplate.mjs`）。
- 验证：`cd /Users/simon/projects/trade-erp/web && pnpm test` 通过（25/25）。
- 下一步：请在 PI 编辑页刷新后复核“隐藏/显示左侧字段区”两种状态下是否都能一页显示。
- 阻塞/风险：若浏览器窗口高度过低（极小分辨率），会继续缩小整页以保证无滚动，视觉上会更小。

## 2026-02-25
- 完成：PI 预览缩放策略改为“按宽度优先适配”，取消按高度压缩导致的页面过小问题，使网页视觉比例更接近 PDF Expert 基准截图（`web/src/erp/data/printTemplates.js`）。
- 完成：PI 适配态下通过运行时样式将模板容器 `max-height` 置空并保持无内部滚动，避免预览区出现滚动条。
- 验证：`cd /Users/simon/projects/trade-erp/web && pnpm test` 通过（25/25）。
- 下一步：请刷新 PI 页面后确认当前比例是否符合基准截图；若仍偏小，将继续微调 `PROFORMA_FIT_PADDING` 与缩放上限。
- 阻塞/风险：在极低窗口高度下，为保持无内部滚动会被容器裁切到底部；这是“按宽度优先”与“固定窗口高度”的物理冲突。

## 2026-02-26
- 完成：PI 预览适配逻辑改为“按有效内容区（`PROFORMA_CANVAS_OFFSET_TOP + PROFORMA_CANVAS_HEIGHT`）缩放”，不再按整页 2000 高度计算，解决一页显示但内容过小的问题（`web/src/erp/data/printTemplates.js`）。
- 完成：恢复高度参与缩放并保持垂直居中，维持“无滚动 + 单页显示”的同时提升可读性。
- 验证：`cd /Users/simon/projects/trade-erp/web && pnpm test` 通过（25/25）。
- 下一步：按你的实际页面截图再微调 `PROFORMA_FIT_PADDING`（当前 12）与内容基准高度（当前 `+8` 兜底）到目标观感。
- 阻塞/风险：若窗口高度极低，仍会优先保证一页完整显示，字体会随之缩小。

## 2026-02-26
- 完成：PI 固定模板切到 A4 基准链路后，补齐预览态容器兜底（`clientWidth/clientHeight` 不可用时回退 `getBoundingClientRect` + `window.innerWidth/innerHeight`），修复首帧被异常缩小导致“字体过小/布局偏移”的问题（`web/src/erp/data/printTemplates.js`）。
- 完成：PI 样式做第二轮收敛：整体字号上调、表格描述行居中、银行区列宽重分配并允许值字段换行，减少底部信息重叠/截断（`web/src/erp/data/proformaInvoiceTemplate.mjs`）。
- 完成：修复 `deliveryMethod` 自动映射重复前缀问题，避免出现 `By By xxx`（`web/src/erp/data/proformaInvoiceTemplate.mjs`）。
- 完成：`pi-pixel-diff` 脚本改为可处理尺寸不一致场景：截图统一整数 viewport，参考图自动按当前截图尺寸归一化后再做 `pixelmatch`，并增加关键等待，避免直接报 `Image sizes do not match`（`web/scripts/pi-pixel-diff.mjs`）。
- 完成：清理 PI 独立 HTML 构建函数里未使用的可选输出缩放参数，保留固定 A4 直出，减少冗余路径与维护复杂度（`web/src/erp/data/proformaInvoiceTemplate.mjs`）。
- 验证：`cd /Users/simon/projects/trade-erp/web && pnpm exec eslint --no-warn-ignored src/erp/data/printTemplates.js src/erp/data/proformaInvoiceTemplate.mjs scripts/pi-pixel-diff.mjs` 通过；`pnpm test` 通过（25/25）；`pnpm pi:pixel-diff -- --ref /Users/simon/Downloads/外销形式发票模版.pdf --out /Users/simon/projects/trade-erp/output/pi-pixel-diff-a4-v4 --browser chrome` 已稳定产出 `diff`（ignoreAA=47393）。
- 下一步：按你最新基准截图继续做最后一轮“字号/行高/竖向节奏”定点微调（主要是顶部标题区与明细表描述区），目标是把差异继续压低并与 PDF Expert 视觉一致。
- 阻塞/风险：当前差异主要来自 PDF 渲染字体与浏览器字体栅格化差异；若需进一步逼近，需要锁定与 PDF Expert 更一致的字体族与渲染参数。

## 2026-02-26
- 完成：补充根 `.gitignore` 忽略规则 `tmp/`，避免本地调试和脚本临时产物误入版本库。
- 下一步：若后续新增临时产物目录，继续按同样方式同步到根忽略规则。
- 阻塞/风险：无。

## 2026-02-28
- 完成：修复固定版式模板“页面预览与浏览器打印不一致”问题：打印态改为整页等比缩放（`4/3`）并保持与页面同一套坐标系，不再在打印阶段把模板内部坐标改为百分比重排（`web/src/erp/data/printTemplates.js`）。
- 完成：新增回归单测，锁定打印窗口必须使用统一缩放且不再出现 `210mm/297mm` 的旧重排规则（`web/src/erp/data/printTemplates.test.js`）。
- 完成：补充前端说明文档“打印一致性说明”，同步建议的浏览器打印参数（`web/README.md`）。
- 验证：`cd /Users/simon/projects/trade-erp/web && pnpm exec eslint --no-warn-ignored src/erp/data/printTemplates.js src/erp/data/printTemplates.test.js` 通过；`pnpm test -- src/erp/data/printTemplates.test.js` 通过（26/26）。
- 下一步：请在“打印模板中心 -> PI/采购合同/开票信息”各抽一条记录点“打印”复核，重点确认字号、行距、边框与页面预览一致。
- 阻塞/风险：不同浏览器对 `zoom` 的打印支持存在差异；已增加 `transform: scale(...)` fallback，但建议优先使用 Chrome/Edge 打印以获得最稳定结果。

## 2026-02-28
- 完成：PI 顶部信息区（`Invoice No./Order No./Date/Email`）收紧标签列宽并微调左右内边距，确保字段名与字段值更靠近、同组阅读更连贯（`web/src/erp/data/proformaInvoiceTemplate.mjs`）。
- 完成：PI 底部收款信息区（`BENEFICIARY NAME/ADDRESS/A/C NO. USD/A/C NO. EURO`）重分配第 2/3 列宽并收紧两列间距，减少标签和值的视觉断层（`web/src/erp/data/proformaInvoiceTemplate.mjs`）。
- 验证：`cd /Users/simon/projects/trade-erp/web && pnpm exec eslint --no-warn-ignored src/erp/data/proformaInvoiceTemplate.mjs` 通过；`pnpm test -- src/erp/data/printTemplates.test.js` 通过（26/26）。
- 下一步：在 PI 编辑页与打印预览各复核 1 次，重点确认长地址场景下仍保持左对齐且不与左侧银行地址区重叠。
- 阻塞/风险：若后续继续压缩第二列宽度，极长英文标签在低缩放下可能更接近换行临界值，需结合实际数据再微调。

## 2026-02-28
- 完成：按页面复核意见继续微调 PI 银行区右侧信息布局：进一步收窄右侧标签列、压缩标签和值间距，并增加右侧分组左内边距，使左/右两组信息分区更明显（`web/src/erp/data/proformaInvoiceTemplate.mjs`）。
- 验证：`cd /Users/simon/projects/trade-erp/web && pnpm exec eslint --no-warn-ignored src/erp/data/proformaInvoiceTemplate.mjs` 通过；`pnpm test -- src/erp/data/printTemplates.test.js` 通过（26/26）。
- 下一步：在真实业务数据下再看一版（特别是超长受益人名称与地址），确认无换行挤压后即可定版。
- 阻塞/风险：右侧标签列继续缩窄后，若未来新增更长标签文案，可能触发换行，需要同步调整文案或列宽。

## 2026-02-28
- 完成：按“仍需更靠近”意见继续收紧 PI 银行区右侧字段：第 2/3 列进一步调整为 `15%/50%`，标签和值横向内边距压到 `0.2px`，强化标签-值贴合度（`web/src/erp/data/proformaInvoiceTemplate.mjs`）。
- 验证：`cd /Users/simon/projects/trade-erp/web && pnpm exec eslint --no-warn-ignored src/erp/data/proformaInvoiceTemplate.mjs` 通过；`pnpm test -- src/erp/data/printTemplates.test.js` 通过（26/26）。
- 下一步：请在当前截图场景复核；若还需更紧，可改为 `14%/51%` 并把第 3 列 `padding-left` 置 `0`。
- 阻塞/风险：列宽继续收窄时，`BENEFICIARY NAME:` 在极端缩放下存在换行风险。

## 2026-02-28
- 完成：定位“看起来没有更靠近”的根因并做结构性修正：右侧标签列由左对齐改为右对齐（贴近值列边界），同时给左侧列补右内边距，避免仅靠微小 `padding` 调整导致视觉不明显（`web/src/erp/data/proformaInvoiceTemplate.mjs`）。
- 验证：`cd /Users/simon/projects/trade-erp/web && pnpm exec eslint --no-warn-ignored src/erp/data/proformaInvoiceTemplate.mjs` 通过；`pnpm test -- src/erp/data/printTemplates.test.js` 通过（26/26）。
- 下一步：请按同一截图位复核；若还需更“贴”，可把右侧标签列再降到 `14%` 并保持右对齐。
- 阻塞/风险：若后续把右侧标签列继续压缩，`BENEFICIARY NAME:` 在低分辨率缩放下可能触发换行。

## 2026-02-28
- 完成：按“太近了，调回一档”要求回调 PI 银行区右侧布局：在保留右侧标签右对齐前提下，将列宽与间距回调到折中值（第 2/3 列 `17%/48%`，标签和值间距恢复为 `1.1px`），避免字段贴得过紧（`web/src/erp/data/proformaInvoiceTemplate.mjs`）。
- 验证：`cd /Users/simon/projects/trade-erp/web && pnpm exec eslint --no-warn-ignored src/erp/data/proformaInvoiceTemplate.mjs` 通过；`pnpm test -- src/erp/data/printTemplates.test.js` 通过（26/26）。
- 下一步：请关闭并重新打开 PI 页面后复核；若仍偏近/偏远，可再按 `0.5px` 级别做最后微调。
- 阻塞/风险：无。

## 2026-02-28
- 完成：按“继续回调”要求再放松一档右侧字段间距：保留右侧标签右对齐，列宽回调到 `19%/46%`，标签和值横向间距提升到 `2.2px`，降低“贴得过近”的观感（`web/src/erp/data/proformaInvoiceTemplate.mjs`）。
- 验证：`cd /Users/simon/projects/trade-erp/web && pnpm exec eslint --no-warn-ignored src/erp/data/proformaInvoiceTemplate.mjs` 通过；`pnpm test -- src/erp/data/printTemplates.test.js` 通过（26/26）。
- 下一步：请重开 PI 页面复核；若还需继续回调，可再提升到 `2.8px` 间距并保持当前对齐策略。
- 阻塞/风险：无。

## 2026-03-01
- 完成：按页面反馈将 PI 银行区右侧标签列由右对齐改为左对齐，统一 `BENEFICIARY NAME/ADDRESS/A/C NO./SWIFT CODE` 起始位置（`web/src/erp/data/proformaInvoiceTemplate.mjs`）。
- 验证：`cd /Users/simon/projects/trade-erp/web && pnpm exec eslint --no-warn-ignored src/erp/data/proformaInvoiceTemplate.mjs` 通过；`pnpm test -- src/erp/data/printTemplates.test.js` 通过（26/26）。
- 下一步：请重开 PI 页面复核最终视觉；如需更规整，可再统一右侧值列最小宽度。
- 阻塞/风险：无。

## 2026-03-01
- 完成：修复 PI 银行区右侧 `ADDRESS` 与 `A/C NO. USD` 之间“空一行”问题：将底部银行信息改为左右独立表布局，避免左侧多行内容撑高右侧行高（`web/src/erp/data/proformaInvoiceTemplate.mjs`）。
- 完成：在新布局下将右侧标签和值再轻微收紧（右侧标签列 `29%`，值列 `71%`，标签/值间距 `1.6px`），满足“稍微再靠近一点”的要求（`web/src/erp/data/proformaInvoiceTemplate.mjs`）。
- 验证：`cd /Users/simon/projects/trade-erp/web && pnpm exec eslint --no-warn-ignored src/erp/data/proformaInvoiceTemplate.mjs` 通过；`pnpm test -- src/erp/data/printTemplates.test.js` 通过（26/26）。
- 下一步：请重开 PI 页面按同一数据复核；若还需微调，我可仅按 `0.4px` 级别收紧/放松右侧间距。
- 阻塞/风险：无。

## 2026-03-01
- 完成：按“再靠近一点点”继续微调 PI 右侧字段和值间距：右侧标签列从 `29%` 调整为 `28%`，值列从 `71%` 调整为 `72%`，标签/值间距从 `1.6px` 调整为 `1.2px`（`web/src/erp/data/proformaInvoiceTemplate.mjs`）。
- 验证：`cd /Users/simon/projects/trade-erp/web && pnpm exec eslint --no-warn-ignored src/erp/data/proformaInvoiceTemplate.mjs` 通过；`pnpm test -- src/erp/data/printTemplates.test.js` 通过（26/26）。
- 下一步：请重开页面复核；若仍需微调，我可再按 `0.2px` 级别调整间距。
- 阻塞/风险：无。

## 2026-03-01
- 完成：按页面反馈收窄 PI 条款区标签列宽度（`Incoterms/Lead-time/Notes`）：标签列从 `18%` 调整为 `16%`，值列从 `32%` 调整为 `34%`，让左侧格子更紧凑（`web/src/erp/data/proformaInvoiceTemplate.mjs`）。
- 验证：`cd /Users/simon/projects/trade-erp/web && pnpm exec eslint --no-warn-ignored src/erp/data/proformaInvoiceTemplate.mjs` 通过；`pnpm test -- src/erp/data/printTemplates.test.js` 通过（26/26）。
- 下一步：请重开页面复核；若还需再窄，可继续下调到 `15%`。
- 阻塞/风险：无。

## 2026-03-01
- 完成：按页面反馈将 PI 明细表右侧金额区全部改为居中（`Net Price`、`Net Value`、`Total Net Value`），统一列内对齐方式（`web/src/erp/data/proformaInvoiceTemplate.mjs`）。
- 完成：移除 PI 模板中未再使用的 `proforma-cell-right` 右对齐样式，避免后续误用导致对齐不一致（`web/src/erp/data/proformaInvoiceTemplate.mjs`）。
- 验证：`cd /Users/simon/projects/trade-erp/web && pnpm exec eslint --no-warn-ignored src/erp/data/proformaInvoiceTemplate.mjs` 通过；`pnpm test -- src/erp/data/printTemplates.test.js` 通过（26/26）。
- 下一步：请重开页面复核金额列观感；若希望“标题居中、数值略偏右”也可再按 1px 级别微调。
- 阻塞/风险：无。

## 2026-03-01
- 完成：按页面反馈调整 PI 卖方签章图片定位：签章图与右侧签字标题列使用同一宽度和起点，确保图片位于 `Authorized Signature Seller` 正上方（`web/src/erp/data/proformaInvoiceTemplate.mjs`）。
- 验证：`cd /Users/simon/projects/trade-erp/web && pnpm exec eslint --no-warn-ignored src/erp/data/proformaInvoiceTemplate.mjs` 通过；`pnpm test -- src/erp/data/printTemplates.test.js` 通过（26/26）。
- 下一步：请重开页面确认签章位置；如需再右移/左移，可按 `1px` 级别微调。
- 阻塞/风险：无。

## 2026-03-01
- 完成：按页面反馈将 PI 条款区字段名格子再缩窄约 1/3：标签列从 `16%` 调整为 `11%`，值列从 `34%` 调整为 `39%`（`web/src/erp/data/proformaInvoiceTemplate.mjs`）。
- 验证：`cd /Users/simon/projects/trade-erp/web && pnpm exec eslint --no-warn-ignored src/erp/data/proformaInvoiceTemplate.mjs` 通过；`pnpm test -- src/erp/data/printTemplates.test.js` 通过（26/26）。
- 下一步：请重开页面复核；若仍需更窄，可继续下调到 `10%`。
- 阻塞/风险：无。

## 2026-03-01
- 完成：按页面反馈处理卖方签章素材空白边：对 `proforma-signature.png` 做去空白裁剪（`680x220` -> `433x172`），减少右侧和底部空白导致的视觉偏移，使图片文字更接近 `Authorized Signature Seller` 正上方（`web/public/templates/proforma-signature.png`）。
- 验证：`cd /Users/simon/projects/trade-erp/web && pnpm test -- src/erp/data/printTemplates.test.js` 通过（26/26）。
- 下一步：请重开 PI 页面复核签章是否与下方文字完全对齐；如仍有偏差，可再做 `1-2px` 级别定位微调。
- 阻塞/风险：无。

## 2026-03-01
- 完成：定位并修复 PI 条款区“字段格子未按预期缩窄”问题：根因是 `table-layout: fixed` 下首行为 `colspan=4`，列宽被均分，`th/td width` 基本不生效；改为 `colgroup` 明确列宽（标签列 `17%`、值列 `33%`）后生效（`web/src/erp/data/proformaInvoiceTemplate.mjs`）。
- 验证：`cd /Users/simon/projects/trade-erp/web && pnpm exec eslint --no-warn-ignored src/erp/data/proformaInvoiceTemplate.mjs` 通过；`pnpm test -- src/erp/data/printTemplates.test.js` 通过（26/26）。
- 下一步：请重开页面复核条款区宽度；若还需更窄，可继续下调标签列到 `16%`。
- 阻塞/风险：无。

## 2026-03-01
- 完成：修复 PI 签章区“图片过高挤压下方文字”问题：签章图改为按高度上限缩放（`max-height: 72px`）并在卖方列内居中，避免将 `Authorized Signature Seller` 顶到分割线附近（`web/src/erp/data/proformaInvoiceTemplate.mjs`）。
- 验证：`cd /Users/simon/projects/trade-erp/web && pnpm exec eslint --no-warn-ignored src/erp/data/proformaInvoiceTemplate.mjs` 通过；`pnpm test -- src/erp/data/printTemplates.test.js` 通过（26/26）。
- 下一步：请重开页面复核签章与签字标题的上下间距；若还偏紧，可再把上限下调到 `68px`。
- 阻塞/风险：无。

## 2026-03-01
- 完成：按页面反馈去掉 PI 卖方签章图片的 `margin`，避免额外空白影响与下方签字标题的贴合（`web/src/erp/data/proformaInvoiceTemplate.mjs`）。
- 验证：`cd /Users/simon/projects/trade-erp/web && pnpm exec eslint --no-warn-ignored src/erp/data/proformaInvoiceTemplate.mjs` 通过；`pnpm test -- src/erp/data/printTemplates.test.js` 通过（26/26）。
- 下一步：请重开页面复核最终位置；若仍有 1-2px 偏差，可继续微调签章容器偏移。
- 阻塞/风险：无。

## 2026-03-01
- 完成：按页面反馈将 PI 签章区整体下移一档：`proforma-signature-zone` 上内边距从 `6.7px` 调整为 `11.2px`，缩小签章内容与下方横线的视觉间距（`web/src/erp/data/proformaInvoiceTemplate.mjs`）。
- 验证：`cd /Users/simon/projects/trade-erp/web && pnpm exec eslint --no-warn-ignored src/erp/data/proformaInvoiceTemplate.mjs` 通过；`pnpm test -- src/erp/data/printTemplates.test.js` 通过（26/26）。
- 下一步：请重开页面复核；若还需再下移，可继续增加 `1-2px`。
- 阻塞/风险：无。

## 2026-03-01
- 完成：按页面反馈将 PI 买方公司名字段改回占位文案优先：移除 `buyerCompanyName` 的 `name` 别名与 `flattenedMap.name` 兜底，避免被通用名称覆盖（`web/src/erp/data/proformaInvoiceTemplate.mjs`）。
- 验证：`cd /Users/simon/projects/trade-erp/web && pnpm exec eslint --no-warn-ignored src/erp/data/proformaInvoiceTemplate.mjs` 通过；`pnpm test -- src/erp/data/printTemplates.test.js` 通过（26/26）。
- 下一步：请重开 PI 页面确认顶部显示是否为 `(Buyer's Company Name)`；若需始终固定显示该文案（即使有买方字段）可继续收紧映射规则。
- 阻塞/风险：无。
