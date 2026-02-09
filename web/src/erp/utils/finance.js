const DATE_ONLY = /^\\d{4}-\\d{2}-\\d{2}$/

const formatDate = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const parseDate = (value) => {
  if (!value) {
    return new Date()
  }

  if (value instanceof Date) {
    return new Date(value)
  }

  if (typeof value === 'string' && DATE_ONLY.test(value)) {
    return new Date(`${value}T00:00:00`)
  }

  return new Date(value)
}

export const calcReceivableDate = (baseDate, paymentCycleDays) => {
  const cycleDays = Number(paymentCycleDays)
  const safeCycleDays = Number.isNaN(cycleDays) ? 0 : cycleDays
  const parsedBaseDate = parseDate(baseDate)
  parsedBaseDate.setDate(parsedBaseDate.getDate() + safeCycleDays)
  return formatDate(parsedBaseDate)
}

export const createAutoCode = (prefix, currentSize, date = new Date(), extraSegments = []) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const serial = String(currentSize + 1).padStart(4, '0')
  const segments = [prefix, ...extraSegments.filter(Boolean), `${year}${month}${day}`, serial]
  return segments.join('-')
}
