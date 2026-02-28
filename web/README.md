# web 前端说明

## 启动与构建

```bash
cd /Users/simon/projects/trade-erp/web
pnpm install
pnpm start
```

```bash
cd /Users/simon/projects/trade-erp/web
pnpm lint
pnpm css
pnpm test
pnpm build
```

## PI 像素级对比（模板 1:1 校验）

> 依赖：macOS 的 `qlmanage`（把参考 PDF 渲染为 PNG）；以及 `npx`（脚本会通过 npx 临时拉起 `playwright-cli` 截图）。

```bash
cd /Users/simon/projects/trade-erp/web
pnpm pi:pixel-diff -- --ref /Users/simon/Downloads/外销形式发票模版.pdf
```

默认输出目录：`/Users/simon/projects/trade-erp/output/pi-pixel-diff/`

- `ref.png`：参考 PDF 渲染图
- `current.png`：当前模板渲染截图
- `diff.png`：像素差异图（忽略抗锯齿）
- `diff-include-aa.png`：像素差异图（包含抗锯齿）

PI 模板默认素材：

- Logo：`/Users/simon/projects/trade-erp/web/public/templates/billing-info-logo.png`
- 卖方签章图：`/Users/simon/projects/trade-erp/web/public/templates/proforma-signature.png`

可选参数：

- `--out /path/to/dir`
- `--record /path/to/record.json`
- `--mask x,y,w,h`（可重复传入，用于忽略某块区域）
- `--browser chrome|firefox|msedge`（默认 `chrome`；`webkit` 需先安装 Playwright 浏览器）

## 打印一致性说明

- 固定版式模板（PI / 采购合同 / 开票信息）在打印态采用整页等比缩放，避免打印时对模板内部坐标二次重排。
- 页面编辑区与浏览器打印结果应保持同一版式结构；若打印对话框仍有偏差，建议先使用 `Margins: None`、`Scale: 100%`、勾选 `Background graphics`。

## 环境变量

- `VITE_BASE_URL`：前端部署基础路径
- `VITE_ENABLE_RPC_MOCK`：是否启用本地 RPC mock

环境文件：

- `/Users/simon/projects/trade-erp/web/.env.development`
- `/Users/simon/projects/trade-erp/web/.env.production`
