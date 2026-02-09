import { createAutoCode } from './finance'

export const applyInventoryDelta = ({
  records = [],
  productName,
  warehouseName,
  location,
  deltaQty,
  codePrefix = 'KC',
}) => {
  if (!productName || !warehouseName || !location || !deltaQty) {
    return {
      records,
      affected: null,
    }
  }

  const nextRecords = [...records]
  const index = nextRecords.findIndex(
    (record) =>
      record.productName === productName &&
      record.warehouseName === warehouseName &&
      record.location === location
  )

  if (index >= 0) {
    const current = nextRecords[index]
    const availableQty = Number(current.availableQty || 0) + Number(deltaQty)
    const updated = {
      ...current,
      availableQty,
    }
    nextRecords[index] = updated
    return {
      records: nextRecords,
      affected: updated,
    }
  }

  const code = createAutoCode(codePrefix, nextRecords.length)
  const created = {
    id: `inventory-${Date.now()}`,
    code,
    productName,
    warehouseName,
    location,
    availableQty: Number(deltaQty),
    lockedQty: 0,
  }
  nextRecords.unshift(created)
  return {
    records: nextRecords,
    affected: created,
  }
}
