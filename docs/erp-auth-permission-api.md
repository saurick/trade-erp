# ERP 登录与权限接口（JSON-RPC）

## 认证域 `auth`

### `admin_login`

- 入参：`username`、`password`
- 返回：`access_token`、`expires_at`、`admin_level`、`menu_permissions`

### `logout`

- 入参：空
- 返回：`code=0`

## 管理域 `admin`

### `me`

- 返回当前管理员信息：
  - `id`、`username`、`level`、`menu_permissions`

### `list`

- 返回管理员列表：
  - `admins[]` 包含 `id`、`username`、`level`、`disabled`、`menu_permissions` 等

### `menu_options`

- 返回系统支持的菜单权限项：
  - `menu_options[]`，字段：`key`、`label`

### `set_permissions`

- 入参：
  - `id`：目标管理员 ID
  - `menu_permissions`：菜单 key 数组
- 权限要求：仅超级管理员可调用
- 说明：仅影响前端菜单显示，不做接口数据级拦截

## ERP 业务域 `erp`

### `list`

- 入参：`module_key`
- 返回：`records[]`

### `create`

- 入参：`module_key`、`record`
- 返回：`record`
- 校验：服务端会校验模块合法性、必填字段、状态箱与数值范围，并补齐派生字段

### `update`

- 入参：`module_key`、`id`、`record`
- 返回：`record`
- 校验：与 `create` 一致

### `delete`

- 入参：`module_key`、`id`
- 返回：`success`

## 文件与模板接口（HTTP）

### `POST /files/upload?category=attachments`

- 认证：管理员 Bearer Token
- Content-Type：`multipart/form-data`
- 文件字段：`file`
- 返回：`data.url`（可直接回填到业务附件字段）

### `GET /files/{category}/{name}`

- 说明：按 URL 读取已上传附件文件

### `POST /templates/upload/{template_key}`

- 认证：管理员 Bearer Token
- Content-Type：`multipart/form-data`
- 文件字段：`file`
- 支持：`.xls`、`.xlsx`
- 说明：上传后覆盖该模板 key 的当前模板文件

### `GET /templates/file/{template_key}`

- 说明：读取指定模板 key 的当前模板文件（优先返回后台已上传模板）

### `POST /templates/render-pdf`

- 认证：管理员 Bearer Token
- Content-Type：`application/json`
- 入参：
  - `title`：模板标题（可选）
  - `file_name`：下载文件名（可选，服务端会兜底与清洗）
  - `html`：待渲染的 HTML（必填，建议传打印态 DOM）
  - `base_url`：静态资源基地址（可选，如 `http://localhost:5173/`）
- 返回：`application/pdf` 二进制流（`inline`）
- 说明：由服务器使用 Headless Chromium 渲染 PDF，适合统一版式预览与下载。

### `GET /metrics`

- 说明：Prometheus 指标采集端点

## 数据库字段

- 表：`admin_users`
- 新增字段：`menu_permissions`（`varchar(4096)`，逗号分隔菜单 key）
- 表：`erp_module_records`
- 新增字段：`module_key`、`code`、`box`、`payload`、`created_by_admin_id`、`updated_by_admin_id`
- 迁移文件：`server/internal/data/model/migrate/20260210090509_baseline.sql`
