# ERP 联调测试数据（可生成 / 可执行 / 可撤销）

> 目标：覆盖 ERP 全菜单真实数据库联调，避免使用前端假数据。
>
> 特性：
> - 支持输出 SQL（不执行）
> - 支持直接执行 up/down
> - 幂等 up（同一前缀重复执行会更新，不会无限重复）
> - 前缀隔离 down（只删除指定前缀生成的数据）

## 1. 生成 SQL（不执行）

在 `server/` 目录执行：

```bash
make -f Makefile.testdata testdata_erp_sql_up
make -f Makefile.testdata testdata_erp_sql_down
```

可选参数通过 `ARGS` 透传：

```bash
make -f Makefile.testdata testdata_erp_sql_up ARGS='-prefix tderp_demo -chain-count 30 -base-date 2026-02-10'
```

## 2. 直接执行 up/down

连接串优先级：

1. `MYSQL_DSN`
2. `server/.env` 中的 `DB_URL`
3. `server/configs/dev/config.yaml` 的 `data.mysql.dsn`

执行命令：

```bash
make -f Makefile.testdata testdata_erp_up
make -f Makefile.testdata testdata_erp_down
```

临时覆盖连接串示例：

```bash
export MYSQL_DSN='root:password@tcp(127.0.0.1:3306)/test_database?charset=utf8mb4&parseTime=true&loc=Local'
make -f Makefile.testdata testdata_erp_up ARGS='-prefix tderp_ci'
```

## 3. 数据规模与覆盖

默认参数：

- `-prefix tderp`
- `-chain-count 20`

每条链路生成 12 条记录，总计默认 `20 * 12 = 240` 条，覆盖模块：

- `partners`（每链路 2 条：客户 + 供应商）
- `products`
- `quotations`
- `exportSales`
- `purchaseContracts`
- `inbound`
- `inventory`
- `shipmentDetails`
- `outbound`
- `settlements`
- `bankReceipts`

同时包含跨模块关联字段（如 `sourceQuotationCode`、`sourceExportCode`、`invoiceNo/refNo`），便于验证菜单联动与打印中心取数。

## 4. 常用参数

`cmd/testdata_erp` 支持：

- `-action up-sql|down-sql|up|down`
- `-prefix`：测试数据前缀（仅字母/数字/下划线）
- `-chain-count`：业务链路数量（每链路 12 条）
- `-admin-username`：写入 `created_by_admin_id/updated_by_admin_id` 时优先匹配的管理员
- `-base-date`：业务日期基准（`YYYY-MM-DD`）
- `-dsn`：MySQL DSN
- `-timeout-sec`：执行超时

示例：

```bash
go run ./cmd/testdata_erp -action up -prefix tderp_perf -chain-count 80 -timeout-sec 60
```

## 5. 安全建议

- 先用 `up-sql/down-sql` 审阅 SQL 再执行。
- 不要在生产库使用过于宽泛的 `prefix`。
- 共享库并发测试时，为每个人设置独立 `prefix`。
