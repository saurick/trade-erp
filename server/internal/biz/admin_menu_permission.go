package biz

import "strings"

type AdminMenuPermissionOption struct {
	Key   string
	Label string
}

var adminMenuPermissionOptions = []AdminMenuPermissionOption{
	{Key: "/dashboard", Label: "业务看板"},
	{Key: "/master/partners", Label: "客户/供应商"},
	{Key: "/master/products", Label: "产品"},
	{Key: "/sales/quotations", Label: "报价单"},
	{Key: "/sales/export", Label: "外销"},
	{Key: "/purchase/contracts", Label: "采购合同"},
	{Key: "/warehouse/inbound", Label: "入库通知/检验/入库"},
	{Key: "/warehouse/inventory", Label: "库存"},
	{Key: "/shipping/details", Label: "出运明细"},
	{Key: "/warehouse/outbound", Label: "出库"},
	{Key: "/finance/settlements", Label: "结汇"},
	{Key: "/finance/bank-receipts", Label: "水单认领"},
	{Key: "/docs/print-center", Label: "打印模板中心"},
	{Key: "/system/permissions", Label: "权限管理"},
}

var adminMenuPermissionSet = func() map[string]struct{} {
	m := make(map[string]struct{}, len(adminMenuPermissionOptions))
	for _, item := range adminMenuPermissionOptions {
		m[item.Key] = struct{}{}
	}
	return m
}()

func AdminMenuPermissionOptions() []AdminMenuPermissionOption {
	out := make([]AdminMenuPermissionOption, len(adminMenuPermissionOptions))
	copy(out, adminMenuPermissionOptions)
	return out
}

func AllAdminMenuPermissions() []string {
	out := make([]string, 0, len(adminMenuPermissionOptions))
	for _, item := range adminMenuPermissionOptions {
		out = append(out, item.Key)
	}
	return out
}

func DefaultAdminMenuPermissions() []string {
	out := make([]string, 0, len(adminMenuPermissionOptions))
	for _, item := range adminMenuPermissionOptions {
		if item.Key == "/system/permissions" {
			continue
		}
		out = append(out, item.Key)
	}
	return out
}

func NormalizeAdminMenuPermissions(input []string) []string {
	if len(input) == 0 {
		return []string{}
	}

	selected := make(map[string]struct{}, len(input))
	for _, raw := range input {
		key := strings.TrimSpace(raw)
		if key == "" {
			continue
		}
		if _, ok := adminMenuPermissionSet[key]; !ok {
			continue
		}
		selected[key] = struct{}{}
	}

	out := make([]string, 0, len(selected))
	for _, item := range adminMenuPermissionOptions {
		if _, ok := selected[item.Key]; ok {
			out = append(out, item.Key)
		}
	}
	return out
}

func EffectiveAdminMenuPermissions(level AdminLevel, menuPermissions []string) []string {
	if level == AdminLevelSuper {
		return AllAdminMenuPermissions()
	}

	normalized := NormalizeAdminMenuPermissions(menuPermissions)
	if len(normalized) > 0 {
		return normalized
	}
	return DefaultAdminMenuPermissions()
}
