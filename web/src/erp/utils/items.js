export const normalizeNumber = (value) => {
  if (value === null || value === undefined || value === '') {
    return 0
  }
  const num = Number(value)
  return Number.isNaN(num) ? 0 : num
}

export const calcItemsTotal = (
  items = [],
  qtyKey = 'quantity',
  priceKey = 'unitPrice'
) => {
  return items.reduce((sum, item) => {
    const qty = normalizeNumber(item?.[qtyKey])
    const price = normalizeNumber(item?.[priceKey])
    return sum + qty * price
  }, 0)
}

export const calcItemsQty = (items = [], qtyKey = 'quantity') => {
  return items.reduce((sum, item) => sum + normalizeNumber(item?.[qtyKey]), 0)
}

export const summarizeItems = (
  items = [],
  qtyKey = 'quantity',
  priceKey = 'unitPrice'
) => {
  const totalQty = calcItemsQty(items, qtyKey)
  const totalAmount = calcItemsTotal(items, qtyKey, priceKey)
  return {
    count: Array.isArray(items) ? items.length : 0,
    totalQty,
    totalAmount,
  }
}
