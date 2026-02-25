const isNonNullObject = (value) => value && typeof value === 'object'

export const pickPrintableRecord = (recordList = []) => {
  if (!Array.isArray(recordList)) {
    return {}
  }
  return recordList.find(isNonNullObject) || {}
}

export const hasPrintableRecord = (recordList = []) => {
  if (!Array.isArray(recordList)) {
    return false
  }
  return recordList.some(
    (item) => isNonNullObject(item) && Object.keys(item).length > 0
  )
}
