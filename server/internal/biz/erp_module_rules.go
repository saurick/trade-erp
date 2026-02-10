package biz

import (
	"fmt"
	"math"
	"strconv"
	"strings"
	"time"
)

const (
	ERPModulePartners          = "partners"
	ERPModuleProducts          = "products"
	ERPModuleQuotations        = "quotations"
	ERPModuleExportSales       = "exportSales"
	ERPModulePurchaseContracts = "purchaseContracts"
	ERPModuleInbound           = "inbound"
	ERPModuleInventory         = "inventory"
	ERPModuleShipmentDetails   = "shipmentDetails"
	ERPModuleOutbound          = "outbound"
	ERPModuleSettlements       = "settlements"
	ERPModuleBankReceipts      = "bankReceipts"
)

const (
	ERPBoxDraft     = "草稿箱"
	ERPBoxPending   = "待批箱"
	ERPBoxApproved  = "已批箱"
	ERPBoxClaim     = "招领箱"
	ERPBoxConfirmed = "确认箱"
	ERPBoxAuto      = "免批"
)

type erpNumberRule struct {
	Min *float64
}

type erpModuleRule struct {
	DefaultBox     string
	RequiredFields []string
	NumberRules    map[string]erpNumberRule
	DeriveFields   func(payload map[string]any) error
}

var erpAllowedBoxes = map[string]struct{}{
	ERPBoxDraft:     {},
	ERPBoxPending:   {},
	ERPBoxApproved:  {},
	ERPBoxClaim:     {},
	ERPBoxConfirmed: {},
	ERPBoxAuto:      {},
}

var erpModuleRules = map[string]erpModuleRule{
	ERPModulePartners: {
		DefaultBox: ERPBoxAuto,
		RequiredFields: []string{
			"partnerType", "name", "address", "contact", "contactPhone", "paymentCycleDays",
		},
		NumberRules: map[string]erpNumberRule{
			"paymentCycleDays": {Min: numberMin(0)},
		},
	},
	ERPModuleProducts: {
		DefaultBox: ERPBoxAuto,
		RequiredFields: []string{
			"hsCode", "specCode", "cnDesc", "enDesc",
		},
	},
	ERPModuleQuotations: {
		DefaultBox: ERPBoxDraft,
		RequiredFields: []string{
			"customerName", "quotedDate", "currency", "items",
		},
		DeriveFields: deriveTotalAmount,
	},
	ERPModuleExportSales: {
		DefaultBox: ERPBoxDraft,
		RequiredFields: []string{
			"customerName", "customerContractNo", "signDate", "deliveryDate", "transportType", "orderFlow", "items",
		},
		DeriveFields: deriveTotalAmount,
	},
	ERPModulePurchaseContracts: {
		DefaultBox: ERPBoxDraft,
		RequiredFields: []string{
			"supplierName", "signDate", "salesNo", "deliveryDate", "deliveryAddress", "invoiceRequired", "items",
		},
		DeriveFields: deriveTotalAmount,
	},
	ERPModuleInbound: {
		DefaultBox: ERPBoxDraft,
		RequiredFields: []string{
			"purchaseCode", "productName", "warehouseName", "location", "qcStatus", "quantity",
		},
		NumberRules: map[string]erpNumberRule{
			"quantity": {Min: numberMin(0.000001)},
		},
	},
	ERPModuleInventory: {
		DefaultBox: ERPBoxAuto,
		RequiredFields: []string{
			"productName", "warehouseName", "location", "availableQty", "lockedQty",
		},
		NumberRules: map[string]erpNumberRule{
			"availableQty": {Min: numberMin(0)},
			"lockedQty":    {Min: numberMin(0)},
		},
	},
	ERPModuleShipmentDetails: {
		DefaultBox: ERPBoxDraft,
		RequiredFields: []string{
			"customerName", "startPort", "destPort", "shipToAddress", "transportType", "arriveCountry", "salesOwner", "items",
		},
		NumberRules: map[string]erpNumberRule{
			"totalPackages": {Min: numberMin(0.000001)},
		},
		DeriveFields: deriveShipmentTotalPackages,
	},
	ERPModuleOutbound: {
		DefaultBox: ERPBoxAuto,
		RequiredFields: []string{
			"shipmentCode", "productName", "quantity", "warehouseName", "location",
		},
		NumberRules: map[string]erpNumberRule{
			"quantity": {Min: numberMin(0.000001)},
		},
	},
	ERPModuleSettlements: {
		DefaultBox: ERPBoxAuto,
		RequiredFields: []string{
			"invoiceNo", "shipDate", "paymentCycleDays", "amount",
		},
		NumberRules: map[string]erpNumberRule{
			"paymentCycleDays": {Min: numberMin(0)},
			"amount":           {Min: numberMin(0.000001)},
		},
		DeriveFields: deriveSettlementReceivableDate,
	},
	ERPModuleBankReceipts: {
		DefaultBox: ERPBoxClaim,
		RequiredFields: []string{
			"fundType", "refNo", "receivedAmount", "bankFee", "registerDate",
		},
		NumberRules: map[string]erpNumberRule{
			"receivedAmount": {Min: numberMin(0.000001)},
			"bankFee":        {Min: numberMin(0)},
		},
	},
}

func normalizeERPModuleKey(moduleKey string) (string, error) {
	key := strings.TrimSpace(moduleKey)
	if key == "" {
		return "", ErrERPInvalidModule
	}
	if _, ok := erpModuleRules[key]; !ok {
		return "", ErrERPInvalidModule
	}
	return key, nil
}

func applyERPModuleRules(moduleKey string, payload map[string]any) (map[string]any, error) {
	rule, ok := erpModuleRules[moduleKey]
	if !ok {
		return nil, ErrERPInvalidModule
	}

	normalized := cloneERPPayload(payload)

	if err := applyERPBoxRule(rule, normalized); err != nil {
		return nil, err
	}
	if rule.DeriveFields != nil {
		if err := rule.DeriveFields(normalized); err != nil {
			return nil, fmt.Errorf("%w: %v", ErrERPInvalidRecord, err)
		}
	}
	if err := validateERPRequiredFields(rule.RequiredFields, normalized); err != nil {
		return nil, err
	}
	if err := validateERPNumberFields(rule.NumberRules, normalized); err != nil {
		return nil, err
	}

	return normalized, nil
}

func applyERPBoxRule(rule erpModuleRule, payload map[string]any) error {
	boxRaw, hasBox := payload["box"]
	if !hasBox || isEmptyERPValue(boxRaw) {
		payload["box"] = rule.DefaultBox
		return nil
	}

	box, ok := boxRaw.(string)
	if !ok {
		return fmt.Errorf("%w: 字段 box 必须是字符串", ErrERPInvalidRecord)
	}
	box = strings.TrimSpace(box)
	if box == "" {
		payload["box"] = rule.DefaultBox
		return nil
	}
	if _, ok := erpAllowedBoxes[box]; !ok {
		return fmt.Errorf("%w: 字段 box 非法", ErrERPInvalidRecord)
	}
	payload["box"] = box
	return nil
}

func validateERPRequiredFields(requiredFields []string, payload map[string]any) error {
	for _, field := range requiredFields {
		if isEmptyERPValue(payload[field]) {
			return fmt.Errorf("%w: 缺少必填字段 %s", ErrERPInvalidRecord, field)
		}
	}
	return nil
}

func validateERPNumberFields(numberRules map[string]erpNumberRule, payload map[string]any) error {
	for field, rule := range numberRules {
		value, ok := toERPFloat64(payload[field])
		if !ok {
			return fmt.Errorf("%w: 字段 %s 必须是数字", ErrERPInvalidRecord, field)
		}
		if rule.Min != nil && value < *rule.Min {
			return fmt.Errorf("%w: 字段 %s 超出范围", ErrERPInvalidRecord, field)
		}
		payload[field] = normalizeERPNumber(value)
	}
	return nil
}

func deriveTotalAmount(payload map[string]any) error {
	items, err := getERPItems(payload["items"])
	if err != nil {
		return err
	}
	payload["totalAmount"] = normalizeERPNumber(calcERPItemsTotal(items))
	return nil
}

func deriveShipmentTotalPackages(payload map[string]any) error {
	items, err := getERPItems(payload["items"])
	if err != nil {
		return err
	}

	currentTotal, ok := toERPFloat64(payload["totalPackages"])
	if ok && currentTotal > 0 {
		payload["totalPackages"] = normalizeERPNumber(currentTotal)
		return nil
	}

	payload["totalPackages"] = normalizeERPNumber(calcERPItemsQty(items))
	return nil
}

func deriveSettlementReceivableDate(payload map[string]any) error {
	shipDateRaw, ok := payload["shipDate"].(string)
	if !ok || strings.TrimSpace(shipDateRaw) == "" {
		return nil
	}
	shipDate, err := parseERPDate(shipDateRaw)
	if err != nil {
		return fmt.Errorf("字段 shipDate 日期格式非法")
	}
	paymentDays, ok := toERPFloat64(payload["paymentCycleDays"])
	if !ok {
		return fmt.Errorf("字段 paymentCycleDays 必须是数字")
	}

	receivableDate := shipDate.AddDate(0, 0, int(paymentDays))
	payload["receivableDate"] = receivableDate.Format("2006-01-02")
	return nil
}

func getERPItems(raw any) ([]map[string]any, error) {
	if raw == nil {
		return []map[string]any{}, nil
	}

	switch rows := raw.(type) {
	case []map[string]any:
		return rows, nil
	case []any:
		out := make([]map[string]any, 0, len(rows))
		for _, row := range rows {
			if row == nil {
				continue
			}
			item, ok := row.(map[string]any)
			if !ok {
				return nil, fmt.Errorf("字段 items 格式非法")
			}
			out = append(out, item)
		}
		return out, nil
	default:
		return nil, fmt.Errorf("字段 items 格式非法")
	}
}

func calcERPItemsTotal(items []map[string]any) float64 {
	total := 0.0
	for _, item := range items {
		qty, _ := toERPFloat64(item["quantity"])
		price, _ := toERPFloat64(item["unitPrice"])
		total += qty * price
	}
	return total
}

func calcERPItemsQty(items []map[string]any) float64 {
	total := 0.0
	for _, item := range items {
		qty, _ := toERPFloat64(item["quantity"])
		total += qty
	}
	return total
}

func parseERPDate(raw string) (time.Time, error) {
	clean := strings.TrimSpace(raw)
	if clean == "" {
		return time.Time{}, fmt.Errorf("empty date")
	}

	layouts := []string{
		"2006-01-02",
		time.RFC3339,
		"2006/01/02",
	}
	for _, layout := range layouts {
		if parsed, err := time.Parse(layout, clean); err == nil {
			return parsed, nil
		}
	}
	return time.Time{}, fmt.Errorf("invalid date")
}

func toERPFloat64(raw any) (float64, bool) {
	switch value := raw.(type) {
	case float64:
		return value, true
	case float32:
		return float64(value), true
	case int:
		return float64(value), true
	case int8:
		return float64(value), true
	case int16:
		return float64(value), true
	case int32:
		return float64(value), true
	case int64:
		return float64(value), true
	case uint:
		return float64(value), true
	case uint8:
		return float64(value), true
	case uint16:
		return float64(value), true
	case uint32:
		return float64(value), true
	case uint64:
		return float64(value), true
	case string:
		clean := strings.TrimSpace(value)
		if clean == "" {
			return 0, false
		}
		parsed, err := strconv.ParseFloat(clean, 64)
		if err != nil {
			return 0, false
		}
		return parsed, true
	default:
		return 0, false
	}
}

func normalizeERPNumber(value float64) any {
	if math.Mod(value, 1) == 0 {
		return int64(value)
	}
	return math.Round(value*10000) / 10000
}

func cloneERPPayload(input map[string]any) map[string]any {
	out := make(map[string]any, len(input))
	for key, value := range input {
		out[key] = value
	}
	return out
}

func isEmptyERPValue(raw any) bool {
	if raw == nil {
		return true
	}

	switch value := raw.(type) {
	case string:
		return strings.TrimSpace(value) == ""
	case []any:
		return len(value) == 0
	case []map[string]any:
		return len(value) == 0
	case map[string]any:
		return len(value) == 0
	default:
		return false
	}
}

func numberMin(value float64) *float64 {
	v := value
	return &v
}
