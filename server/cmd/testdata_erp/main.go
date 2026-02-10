package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"math"
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	mysqlDriver "github.com/go-sql-driver/mysql"
	"gopkg.in/yaml.v3"
)

const (
	defaultAction      = "up-sql"
	defaultPrefix      = "tderp"
	defaultChainCount  = 20
	defaultTimeoutSec  = 20
	defaultAdminUser   = "admin"
	defaultConfigPath  = "configs/dev/config.yaml"
	dateLayout         = "2006-01-02"
	maxChainCountLimit = 500
)

var prefixPattern = regexp.MustCompile(`^[a-zA-Z0-9_]+$`)

type seedRecord struct {
	ModuleKey string
	Code      string
	Box       string
	Payload   map[string]any
}

type sqlPlan struct {
	UpCore       []string
	DownCore     []string
	UpVerify     []string
	DownVerify   []string
	TotalRecords int
}

func main() {
	var (
		action       string
		prefix       string
		chainCount   int
		adminUser    string
		baseDateText string
		dsn          string
		timeoutSec   int
	)

	flag.StringVar(&action, "action", defaultAction, "动作: up-sql | down-sql | up | down")
	flag.StringVar(&prefix, "prefix", defaultPrefix, "测试数据前缀（仅允许字母/数字/下划线，建议 <=20）")
	flag.IntVar(&chainCount, "chain-count", defaultChainCount, "每条业务链路样本数（每条链路会生成 12 条记录）")
	flag.StringVar(&adminUser, "admin-username", defaultAdminUser, "写入 created_by/updated_by 时优先匹配的管理员用户名")
	flag.StringVar(&baseDateText, "base-date", time.Now().Format(dateLayout), "业务基准日期(YYYY-MM-DD)")
	flag.StringVar(&dsn, "dsn", firstEnv("MYSQL_DSN", "DB_DSN", "DB_URL"), "MySQL DSN（action=up/down 时可通过 MYSQL_DSN/DB_URL 传入）")
	flag.IntVar(&timeoutSec, "timeout-sec", defaultTimeoutSec, "执行 SQL 超时时间（秒，仅 action=up/down 生效）")
	flag.Parse()

	baseDate, err := time.ParseInLocation(dateLayout, strings.TrimSpace(baseDateText), time.Local)
	if err != nil {
		exitf("base-date 格式错误，必须是 YYYY-MM-DD: %v", err)
	}

	plan, err := buildPlan(prefix, chainCount, adminUser, baseDate)
	if err != nil {
		exitf("构建 SQL 失败: %v", err)
	}

	switch action {
	case "up-sql":
		fmt.Print(renderScript(
			"ERP 全菜单联调测试数据（插入/更新）",
			fmt.Sprintf("prefix=%s, chain-count=%d, total-records=%d", prefix, chainCount, plan.TotalRecords),
			plan.UpCore,
			plan.UpVerify,
		))
	case "down-sql":
		fmt.Print(renderScript(
			"ERP 全菜单联调测试数据（撤销）",
			fmt.Sprintf("仅删除 code 以 %s_ 开头的测试记录", prefix),
			plan.DownCore,
			plan.DownVerify,
		))
	case "up", "down":
		if timeoutSec <= 0 {
			exitf("timeout-sec 必须 > 0")
		}

		resolvedDSN, source, err := resolveDSN(dsn)
		if err != nil {
			exitf("获取 dsn 失败: %v", err)
		}

		normalizedDSN, err := normalizeDSN(resolvedDSN)
		if err != nil {
			exitf("dsn 无效: %v", err)
		}

		core := plan.UpCore
		if action == "down" {
			core = plan.DownCore
		}

		fmt.Fprintf(os.Stderr, "using dsn from %s\n", source)
		ctx, cancel := context.WithTimeout(context.Background(), time.Duration(timeoutSec)*time.Second)
		defer cancel()

		if err := execCore(ctx, normalizedDSN, core); err != nil {
			exitf("执行失败(action=%s): %v", action, err)
		}

		fmt.Printf("执行完成(action=%s, prefix=%s, chain-count=%d, total-records=%d)\n", action, prefix, chainCount, plan.TotalRecords)
	default:
		exitf("不支持的 action=%s，支持: up-sql | down-sql | up | down", action)
	}
}

func buildPlan(prefix string, chainCount int, adminUsername string, baseDate time.Time) (*sqlPlan, error) {
	prefix = strings.TrimSpace(prefix)
	if prefix == "" {
		return nil, errors.New("prefix 不能为空")
	}
	if !prefixPattern.MatchString(prefix) {
		return nil, errors.New("prefix 仅允许字母/数字/下划线")
	}
	if len(prefix) > 20 {
		return nil, errors.New("prefix 过长，建议 <=20")
	}

	adminUsername = strings.TrimSpace(adminUsername)
	if adminUsername == "" {
		return nil, errors.New("admin-username 不能为空")
	}
	if len(adminUsername) > 64 {
		return nil, errors.New("admin-username 过长")
	}

	if chainCount <= 0 {
		return nil, errors.New("chain-count 必须 > 0")
	}
	if chainCount > maxChainCountLimit {
		return nil, fmt.Errorf("chain-count 过大，最大支持 %d", maxChainCountLimit)
	}

	records, err := buildSeedRecords(prefix, chainCount, baseDate)
	if err != nil {
		return nil, err
	}

	upCore, err := buildUpCore(records, adminUsername)
	if err != nil {
		return nil, err
	}
	downCore := buildDownCore(prefix)

	likePattern := buildCodeLikePattern(prefix)
	whereClause := fmt.Sprintf("module_key IN (%s) AND code LIKE %s ESCAPE '\\\\'", quoteList(erpModuleKeys), quote(likePattern))

	upVerify := []string{
		fmt.Sprintf("SELECT module_key, COUNT(1) AS cnt FROM erp_module_records WHERE %s GROUP BY module_key ORDER BY module_key", whereClause),
		fmt.Sprintf("SELECT COUNT(1) AS total_cnt FROM erp_module_records WHERE %s", whereClause),
	}
	downVerify := []string{
		fmt.Sprintf("SELECT module_key, COUNT(1) AS left_cnt FROM erp_module_records WHERE %s GROUP BY module_key ORDER BY module_key", whereClause),
		fmt.Sprintf("SELECT COUNT(1) AS left_total_cnt FROM erp_module_records WHERE %s", whereClause),
	}

	return &sqlPlan{
		UpCore:       upCore,
		DownCore:     downCore,
		UpVerify:     upVerify,
		DownVerify:   downVerify,
		TotalRecords: len(records),
	}, nil
}

func buildUpCore(records []seedRecord, adminUsername string) ([]string, error) {
	statements := []string{
		"SET @seed_now = NOW()",
		fmt.Sprintf("SET @seed_admin_username = %s", quote(adminUsername)),
		"SET @seed_admin_id = (SELECT id FROM admin_users WHERE username = @seed_admin_username LIMIT 1)",
		"SET @seed_admin_id = IFNULL(@seed_admin_id, (SELECT id FROM admin_users ORDER BY id LIMIT 1))",
	}

	for _, item := range records {
		stmt, err := buildUpsertSQL(item)
		if err != nil {
			return nil, err
		}
		statements = append(statements, stmt)
	}

	return statements, nil
}

func buildUpsertSQL(item seedRecord) (string, error) {
	if strings.TrimSpace(item.ModuleKey) == "" {
		return "", errors.New("seed record module_key 不能为空")
	}
	if strings.TrimSpace(item.Code) == "" {
		return "", fmt.Errorf("seed record code 不能为空(module=%s)", item.ModuleKey)
	}
	if strings.TrimSpace(item.Box) == "" {
		return "", fmt.Errorf("seed record box 不能为空(module=%s code=%s)", item.ModuleKey, item.Code)
	}

	payloadJSON, err := json.Marshal(item.Payload)
	if err != nil {
		return "", fmt.Errorf("payload 序列化失败(module=%s code=%s): %w", item.ModuleKey, item.Code, err)
	}

	return fmt.Sprintf(`INSERT INTO erp_module_records (
  module_key, code, box, payload, created_by_admin_id, updated_by_admin_id, created_at, updated_at
) VALUES (
  %s, %s, %s, %s, @seed_admin_id, @seed_admin_id, @seed_now, @seed_now
)
ON DUPLICATE KEY UPDATE
  box = VALUES(box),
  payload = VALUES(payload),
  updated_by_admin_id = VALUES(updated_by_admin_id),
  updated_at = @seed_now`,
		quote(item.ModuleKey),
		quote(item.Code),
		quote(item.Box),
		quote(string(payloadJSON)),
	), nil
}

func buildDownCore(prefix string) []string {
	likePattern := buildCodeLikePattern(prefix)
	return []string{
		fmt.Sprintf(
			"DELETE FROM erp_module_records WHERE module_key IN (%s) AND code LIKE %s ESCAPE '\\\\'",
			quoteList(erpModuleKeys),
			quote(likePattern),
		),
	}
}

func buildSeedRecords(prefix string, chainCount int, baseDate time.Time) ([]seedRecord, error) {
	records := make([]seedRecord, 0, chainCount*12)

	for i := 1; i <= chainCount; i++ {
		chainDate := baseDate.AddDate(0, 0, i-1)
		chainRecords, err := buildChainRecords(prefix, i, chainDate)
		if err != nil {
			return nil, err
		}
		records = append(records, chainRecords...)
	}

	return records, nil
}

func buildChainRecords(prefix string, index int, baseDate time.Time) ([]seedRecord, error) {
	seq := fmt.Sprintf("%03d", index)
	upperPrefix := strings.ToUpper(prefix)
	chainID := fmt.Sprintf("%s_CHAIN_%s", upperPrefix, seq)

	customerCode := fmt.Sprintf("%s_CS_%s", upperPrefix, seq)
	supplierCode := fmt.Sprintf("%s_GYS_%s", upperPrefix, seq)
	productCode := fmt.Sprintf("%s_PD_%s", upperPrefix, seq)
	quotationCode := fmt.Sprintf("%s_QT_%s", upperPrefix, seq)
	exportCode := fmt.Sprintf("%s_XS_%s", upperPrefix, seq)
	purchaseCode := fmt.Sprintf("%s_CG_%s", upperPrefix, seq)
	inboundCode := fmt.Sprintf("%s_RK_%s", upperPrefix, seq)
	inventoryCode := fmt.Sprintf("%s_KC_%s", upperPrefix, seq)
	shipmentCode := fmt.Sprintf("%s_CY_%s", upperPrefix, seq)
	outboundCode := fmt.Sprintf("%s_CK_%s", upperPrefix, seq)
	settlementCode := fmt.Sprintf("%s_JH_%s", upperPrefix, seq)
	bankCode := fmt.Sprintf("%s_SD_%s", upperPrefix, seq)

	customerName := fmt.Sprintf("%s_合作客户_%s", prefix, seq)
	supplierName := fmt.Sprintf("%s_合作供应商_%s", prefix, seq)
	productName := fmt.Sprintf("%s_钕铁硼磁钢_%s", prefix, seq)
	productCNDesc := fmt.Sprintf("高性能烧结钕铁硼磁钢 %s", seq)
	productENDesc := fmt.Sprintf("Sintered NdFeB Magnet %s", seq)
	specCode := fmt.Sprintf("SPEC-%s", seq)
	hsCode := cycle([]string{"85051110", "85051190"}, index)

	paymentCycleDays := 30 + (index % 21)
	draftBox := cycle([]string{"草稿箱", "待批箱", "已批箱"}, index)
	bankBox := cycle([]string{"招领箱", "确认箱"}, index)

	signDate := baseDate.AddDate(0, 0, -(index % 25))
	quoteDate := signDate.AddDate(0, 0, -2)
	deliveryDate := signDate.AddDate(0, 0, 10+(index%15))
	shipDate := deliveryDate.AddDate(0, 0, -(index%5 + 2))
	registerDate := shipDate.AddDate(0, 0, 2)

	qtyA := float64(60 + (index%8)*10)
	qtyB := float64(30 + (index%6)*5)
	unitA := 1.3 + float64(index%7)*0.45
	unitB := 0.9 + float64(index%5)*0.4
	amountA := round2(qtyA * unitA)
	amountB := round2(qtyB * unitB)
	totalAmount := round2(amountA + amountB)
	totalPackages := round2(qtyA + qtyB)
	bankFee := round2(totalAmount * 0.008)
	receivableDate := shipDate.AddDate(0, 0, paymentCycleDays)

	currency := cycle([]string{"USD", "EUR", "CNY"}, index)
	transport := cycle([]string{"海运", "空运", "快递"}, index)
	payMode := cycle([]string{"T/T", "L/C", "D/P"}, index)
	priceTerm := cycle([]string{"FOB", "CIF", "EXW"}, index)
	orderFlow := cycle([]string{"成品采购", "内部生产"}, index)
	invoiceRequired := cycle([]string{"是", "否"}, index)
	qcStatus := cycle([]string{"待检验", "检验合格", "检验合格"}, index)
	fundType := cycle([]string{"预收客户货款", "客户货款尾款"}, index)

	quotationItems := []map[string]any{
		{
			"productName": productName,
			"quantity":    qtyA,
			"unitPrice":   round4(unitA),
			"totalPrice":  amountA,
		},
		{
			"productName": productName + "-辅材",
			"quantity":    qtyB,
			"unitPrice":   round4(unitB),
			"totalPrice":  amountB,
		},
	}

	exportItems := []map[string]any{
		{
			"productName": productName,
			"cnDesc":      productCNDesc,
			"enDesc":      productENDesc,
			"quantity":    qtyA,
			"unitPrice":   round4(unitA),
			"totalPrice":  amountA,
			"packDetail":  "纸箱+防潮袋",
		},
		{
			"productName": productName + "-辅材",
			"cnDesc":      productCNDesc + " 辅材",
			"enDesc":      productENDesc + " accessory",
			"quantity":    qtyB,
			"unitPrice":   round4(unitB),
			"totalPrice":  amountB,
			"packDetail":  "托盘",
		},
	}

	purchaseItems := []map[string]any{
		{
			"productName": productName,
			"specCode":    specCode,
			"quantity":    qtyA,
			"unitPrice":   round4(unitA * 0.72),
			"totalPrice":  round2(qtyA * unitA * 0.72),
		},
		{
			"productName": productName + "-辅材",
			"specCode":    specCode + "-B",
			"quantity":    qtyB,
			"unitPrice":   round4(unitB * 0.7),
			"totalPrice":  round2(qtyB * unitB * 0.7),
		},
	}

	shipmentItems := []map[string]any{
		{
			"productModel": productName,
			"quantity":     qtyA,
			"unitPrice":    round4(unitA),
			"packDetail":   "木箱",
			"netWeight":    round2(qtyA * 0.22),
			"grossWeight":  round2(qtyA * 0.25),
			"volume":       round2(qtyA * 0.01),
		},
		{
			"productModel": productName + "-辅材",
			"quantity":     qtyB,
			"unitPrice":    round4(unitB),
			"packDetail":   "纸箱",
			"netWeight":    round2(qtyB * 0.18),
			"grossWeight":  round2(qtyB * 0.2),
			"volume":       round2(qtyB * 0.008),
		},
	}

	warehouseName := fmt.Sprintf("杭州%d号仓", (index%3)+1)
	location := fmt.Sprintf("A-%02d-%02d", (index%4)+1, (index%7)+1)
	salesOwner := fmt.Sprintf("业务员%02d", (index%11)+1)

	records := []seedRecord{
		{
			ModuleKey: "partners",
			Code:      customerCode,
			Box:       "免批",
			Payload: withSeedMeta(map[string]any{
				"code":             customerCode,
				"box":              "免批",
				"partnerType":      "合作客户",
				"name":             customerName,
				"address":          fmt.Sprintf("浙江省杭州市临平区测试路%d号", 100+index),
				"contact":          fmt.Sprintf("客户联系人%s", seq),
				"contactPhone":     fmt.Sprintf("1390000%04d", index),
				"taxNo":            fmt.Sprintf("%s-CUST-TAX-%03d", upperPrefix, index),
				"paymentCycleDays": paymentCycleDays,
			}, prefix, index, chainID),
		},
		{
			ModuleKey: "partners",
			Code:      supplierCode,
			Box:       "免批",
			Payload: withSeedMeta(map[string]any{
				"code":             supplierCode,
				"box":              "免批",
				"partnerType":      "合作供应商",
				"name":             supplierName,
				"address":          fmt.Sprintf("浙江省宁波市余姚区测试路%d号", 300+index),
				"contact":          fmt.Sprintf("供应商联系人%s", seq),
				"contactPhone":     fmt.Sprintf("1370000%04d", index),
				"taxNo":            fmt.Sprintf("%s-SUP-TAX-%03d", upperPrefix, index),
				"paymentCycleDays": 30,
			}, prefix, index, chainID),
		},
		{
			ModuleKey: "products",
			Code:      productCode,
			Box:       "免批",
			Payload: withSeedMeta(map[string]any{
				"code":       productCode,
				"box":        "免批",
				"hsCode":     hsCode,
				"specCode":   specCode,
				"cnDesc":     productCNDesc,
				"enDesc":     productENDesc,
				"attachment": "",
			}, prefix, index, chainID),
		},
		{
			ModuleKey: "quotations",
			Code:      quotationCode,
			Box:       draftBox,
			Payload: withSeedMeta(map[string]any{
				"code":           quotationCode,
				"box":            draftBox,
				"customerName":   customerName,
				"quotedDate":     formatDate(quoteDate),
				"currency":       currency,
				"priceTerm":      priceTerm,
				"deliveryMethod": transport,
				"payMode":        payMode,
				"startPlace":     "宁波",
				"endPlace":       cycle([]string{"巴塞罗那", "汉堡", "长滩"}, index),
				"items":          quotationItems,
				"totalAmount":    totalAmount,
			}, prefix, index, chainID),
		},
		{
			ModuleKey: "exportSales",
			Code:      exportCode,
			Box:       draftBox,
			Payload: withSeedMeta(map[string]any{
				"code":                exportCode,
				"box":                 draftBox,
				"customerName":        customerName,
				"customerContractNo":  fmt.Sprintf("HT-%s-%s", upperPrefix, seq),
				"orderNo":             fmt.Sprintf("ORDER-%s-%s", upperPrefix, seq),
				"orderDate":           formatDate(quoteDate),
				"signDate":            formatDate(signDate),
				"deliveryDate":        formatDate(deliveryDate),
				"transportType":       transport,
				"paymentMethod":       payMode,
				"priceTerm":           priceTerm,
				"startPlace":          "宁波",
				"endPlace":            cycle([]string{"巴塞罗那", "汉堡", "长滩"}, index),
				"orderFlow":           orderFlow,
				"items":               exportItems,
				"totalAmount":         totalAmount,
				"sourceQuotationCode": quotationCode,
			}, prefix, index, chainID),
		},
		{
			ModuleKey: "purchaseContracts",
			Code:      purchaseCode,
			Box:       draftBox,
			Payload: withSeedMeta(map[string]any{
				"code":             purchaseCode,
				"box":              draftBox,
				"supplierName":     supplierName,
				"signDate":         formatDate(signDate),
				"salesNo":          fmt.Sprintf("XSY-%03d", index),
				"deliveryDate":     formatDate(deliveryDate),
				"deliveryAddress":  "杭州临平仓",
				"follower":         fmt.Sprintf("跟单员%02d", (index%9)+1),
				"buyer":            fmt.Sprintf("采购员%02d", (index%7)+1),
				"invoiceRequired":  invoiceRequired,
				"items":            purchaseItems,
				"totalAmount":      round2(totalAmount * 0.72),
				"sourceExportCode": exportCode,
			}, prefix, index, chainID),
		},
		{
			ModuleKey: "inbound",
			Code:      inboundCode,
			Box:       draftBox,
			Payload: withSeedMeta(map[string]any{
				"code":          inboundCode,
				"box":           draftBox,
				"entryNo":       fmt.Sprintf("ENTRY-%s-%s", upperPrefix, seq),
				"purchaseCode":  purchaseCode,
				"productName":   productName,
				"warehouseName": warehouseName,
				"location":      location,
				"qcStatus":      qcStatus,
				"quantity":      qtyA,
				"remark":        "测试批量入库记录",
			}, prefix, index, chainID),
		},
		{
			ModuleKey: "inventory",
			Code:      inventoryCode,
			Box:       "免批",
			Payload: withSeedMeta(map[string]any{
				"code":          inventoryCode,
				"box":           "免批",
				"productName":   productName,
				"warehouseName": warehouseName,
				"location":      location,
				"availableQty":  round2(qtyA*1.8 + qtyB),
				"lockedQty":     float64(index % 4),
			}, prefix, index, chainID),
		},
		{
			ModuleKey: "shipmentDetails",
			Code:      shipmentCode,
			Box:       draftBox,
			Payload: withSeedMeta(map[string]any{
				"code":              shipmentCode,
				"box":               draftBox,
				"customerName":      customerName,
				"startPort":         "宁波",
				"destPort":          cycle([]string{"Barcelona", "Hamburg", "Long Beach"}, index),
				"shipToAddress":     cycle([]string{"Spain", "Germany", "USA"}, index) + " Warehouse",
				"transportType":     transport,
				"arriveCountry":     cycle([]string{"Spain", "Germany", "USA"}, index),
				"salesOwner":        salesOwner,
				"warehouseShipDate": formatDate(shipDate),
				"totalPackages":     totalPackages,
				"items":             shipmentItems,
				"sourceExportCode":  exportCode,
			}, prefix, index, chainID),
		},
		{
			ModuleKey: "outbound",
			Code:      outboundCode,
			Box:       "免批",
			Payload: withSeedMeta(map[string]any{
				"code":          outboundCode,
				"box":           "免批",
				"shipmentCode":  shipmentCode,
				"productName":   productName,
				"quantity":      qtyB,
				"warehouseName": warehouseName,
				"location":      location,
				"remark":        "测试批量出库记录",
			}, prefix, index, chainID),
		},
		{
			ModuleKey: "settlements",
			Code:      settlementCode,
			Box:       "免批",
			Payload: withSeedMeta(map[string]any{
				"code":             settlementCode,
				"box":              "免批",
				"invoiceNo":        shipmentCode,
				"shipDate":         formatDate(shipDate),
				"paymentCycleDays": paymentCycleDays,
				"amount":           totalAmount,
				"receivableDate":   formatDate(receivableDate),
				"customerName":     customerName,
			}, prefix, index, chainID),
		},
		{
			ModuleKey: "bankReceipts",
			Code:      bankCode,
			Box:       bankBox,
			Payload: withSeedMeta(map[string]any{
				"code":           bankCode,
				"box":            bankBox,
				"fundType":       fundType,
				"refNo":          shipmentCode,
				"receivedAmount": totalAmount,
				"bankFee":        bankFee,
				"registerDate":   formatDate(registerDate),
				"remark":         "测试批量水单记录",
			}, prefix, index, chainID),
		},
	}

	return records, nil
}

func withSeedMeta(payload map[string]any, prefix string, index int, chainID string) map[string]any {
	payload["_seed_prefix"] = prefix
	payload["_seed_index"] = index
	payload["_seed_chain"] = chainID
	return payload
}

func formatDate(t time.Time) string {
	return t.Format(dateLayout)
}

func buildCodeLikePattern(prefix string) string {
	escaped := strings.ReplaceAll(prefix, `\`, `\\`)
	escaped = strings.ReplaceAll(escaped, `%`, `\%`)
	escaped = strings.ReplaceAll(escaped, `_`, `\_`)
	return escaped + `\_%`
}

func renderScript(title, tip string, core, verify []string) string {
	var b strings.Builder
	b.WriteString("-- ========================================\n")
	b.WriteString("-- " + title + "\n")
	if strings.TrimSpace(tip) != "" {
		b.WriteString("-- " + tip + "\n")
	}
	b.WriteString("-- generated at: " + time.Now().Format(time.RFC3339) + "\n")
	b.WriteString("-- ========================================\n\n")

	b.WriteString("START TRANSACTION;\n\n")
	for _, stmt := range core {
		b.WriteString(stmt)
		b.WriteString(";\n\n")
	}
	b.WriteString("COMMIT;\n\n")

	if len(verify) > 0 {
		b.WriteString("-- 验证查询（可选）\n")
		for _, stmt := range verify {
			b.WriteString(stmt)
			b.WriteString(";\n\n")
		}
	}

	return b.String()
}

func execCore(ctx context.Context, dsn string, statements []string) error {
	db, err := sql.Open("mysql", dsn)
	if err != nil {
		return fmt.Errorf("sql.Open: %w", err)
	}
	defer db.Close()

	if err := db.PingContext(ctx); err != nil {
		return fmt.Errorf("db.PingContext: %w", err)
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("db.BeginTx: %w", err)
	}
	defer func() {
		_ = tx.Rollback()
	}()

	for i, stmt := range statements {
		if _, err := tx.ExecContext(ctx, stmt); err != nil {
			return fmt.Errorf("执行第 %d 条失败: %w\nSQL:\n%s", i+1, err, stmt)
		}
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("tx.Commit: %w", err)
	}
	return nil
}

func resolveDSN(cliOrEnvDSN string) (dsn string, source string, err error) {
	if v := strings.TrimSpace(cliOrEnvDSN); v != "" {
		return v, "flag/env", nil
	}

	cfgPath := firstEnv("TESTDATA_CONFIG_PATH")
	if strings.TrimSpace(cfgPath) == "" {
		cfgPath = defaultConfigPath
	}

	cfgDSN, err := dsnFromConfigFile(cfgPath)
	if err != nil {
		return "", "", err
	}
	return cfgDSN, "config:" + cfgPath, nil
}

func normalizeDSN(raw string) (string, error) {
	dsn := strings.TrimSpace(raw)
	if dsn == "" {
		return "", errors.New("dsn 不能为空")
	}

	if !strings.HasPrefix(strings.ToLower(dsn), "mysql://") {
		return dsn, nil
	}

	u, err := url.Parse(dsn)
	if err != nil {
		return "", fmt.Errorf("解析 DB_URL 失败: %w", err)
	}
	if !strings.EqualFold(u.Scheme, "mysql") {
		return "", fmt.Errorf("仅支持 mysql://，当前是 %s://", u.Scheme)
	}
	if u.User == nil || u.User.Username() == "" {
		return "", errors.New("DB_URL 缺少用户名")
	}
	if strings.TrimSpace(u.Host) == "" {
		return "", errors.New("DB_URL 缺少 host:port")
	}

	dbName := strings.TrimPrefix(u.Path, "/")
	if strings.TrimSpace(dbName) == "" {
		return "", errors.New("DB_URL 缺少数据库名")
	}

	cfg := mysqlDriver.NewConfig()
	cfg.User = u.User.Username()
	if pwd, ok := u.User.Password(); ok {
		cfg.Passwd = pwd
	}
	cfg.Net = "tcp"
	cfg.Addr = u.Host
	cfg.DBName = dbName

	params, err := url.ParseQuery(u.RawQuery)
	if err != nil {
		return "", fmt.Errorf("解析 DB_URL query 失败: %w", err)
	}
	if len(params) > 0 {
		cfg.Params = make(map[string]string, len(params))
		for k, v := range params {
			if len(v) == 0 {
				cfg.Params[k] = ""
				continue
			}
			cfg.Params[k] = v[len(v)-1]
		}
	}

	return cfg.FormatDSN(), nil
}

type testDataConfig struct {
	Data struct {
		Mysql struct {
			DSN string `yaml:"dsn"`
		} `yaml:"mysql"`
	} `yaml:"data"`
}

func dsnFromConfigFile(path string) (string, error) {
	abs, err := filepath.Abs(path)
	if err != nil {
		return "", fmt.Errorf("解析配置路径失败(path=%s): %w", path, err)
	}

	b, err := os.ReadFile(abs)
	if err != nil {
		return "", fmt.Errorf("读取配置文件失败(path=%s): %w", abs, err)
	}

	var cfg testDataConfig
	if err := yaml.Unmarshal(b, &cfg); err != nil {
		return "", fmt.Errorf("解析 YAML 失败(path=%s): %w", abs, err)
	}

	dsn := strings.TrimSpace(cfg.Data.Mysql.DSN)
	if dsn == "" {
		return "", fmt.Errorf("配置文件缺少 data.mysql.dsn(path=%s)", abs)
	}

	return dsn, nil
}

func quote(s string) string {
	return "'" + strings.ReplaceAll(s, "'", "''") + "'"
}

func quoteList(items []string) string {
	out := make([]string, 0, len(items))
	for _, item := range items {
		out = append(out, quote(item))
	}
	return strings.Join(out, ", ")
}

func firstEnv(keys ...string) string {
	for _, key := range keys {
		if value := strings.TrimSpace(os.Getenv(key)); value != "" {
			return value
		}
	}
	return ""
}

func round2(v float64) float64 {
	return math.Round(v*100) / 100
}

func round4(v float64) float64 {
	return math.Round(v*10000) / 10000
}

func cycle(options []string, index int) string {
	if len(options) == 0 {
		return ""
	}
	idx := (index - 1) % len(options)
	if idx < 0 {
		idx += len(options)
	}
	return options[idx]
}

func exitf(format string, args ...any) {
	fmt.Fprintf(os.Stderr, format+"\n", args...)
	os.Exit(1)
}

var erpModuleKeys = []string{
	"partners",
	"products",
	"quotations",
	"exportSales",
	"purchaseContracts",
	"inbound",
	"inventory",
	"shipmentDetails",
	"outbound",
	"settlements",
	"bankReceipts",
}

func init() {
	seen := map[string]struct{}{}
	for _, key := range erpModuleKeys {
		if _, ok := seen[key]; ok {
			panic("duplicated module key: " + key)
		}
		seen[key] = struct{}{}
	}
}
