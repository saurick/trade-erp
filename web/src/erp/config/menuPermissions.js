export const ERP_MENU_PERMISSION_OPTIONS = [
  { key: '/dashboard', label: '业务看板' },
  { key: '/master/partners', label: '客户/供应商' },
  { key: '/master/products', label: '产品' },
  { key: '/sales/quotations', label: '报价单' },
  { key: '/sales/export', label: '外销' },
  { key: '/purchase/contracts', label: '采购合同' },
  { key: '/warehouse/inbound', label: '入库通知/检验/入库' },
  { key: '/warehouse/inventory', label: '库存' },
  { key: '/shipping/details', label: '出运明细' },
  { key: '/warehouse/outbound', label: '出库' },
  { key: '/finance/settlements', label: '结汇' },
  { key: '/finance/bank-receipts', label: '水单认领' },
  { key: '/docs/print-center', label: '打印模板中心' },
  { key: '/system/permissions', label: '权限管理' },
]

const permissionSet = new Set(ERP_MENU_PERMISSION_OPTIONS.map((item) => item.key))

export const normalizeMenuPermissions = (permissions = []) => {
  if (!Array.isArray(permissions)) {
    return []
  }

  const selected = new Set()
  permissions.forEach((rawKey) => {
    const key = String(rawKey || '').trim()
    if (!key) {
      return
    }
    if (!permissionSet.has(key)) {
      return
    }
    selected.add(key)
  })

  return ERP_MENU_PERMISSION_OPTIONS
    .map((item) => item.key)
    .filter((key) => selected.has(key))
}

export const defaultMenuPermissions = () =>
  ERP_MENU_PERMISSION_OPTIONS.filter((item) => item.key !== '/system/permissions').map((item) => item.key)

export const getPermissionLabel = (key) => {
  const matched = ERP_MENU_PERMISSION_OPTIONS.find((item) => item.key === key)
  return matched?.label || key
}

