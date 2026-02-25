const escapeHTML = (raw) =>
  String(raw ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')

const flattenRecord = (record = {}) => {
  const out = {}
  Object.entries(record || {}).forEach(([key, value]) => {
    if (value == null) {
      out[key] = ''
      return
    }
    if (typeof value === 'object') {
      out[key] = JSON.stringify(value, null, 2)
      return
    }
    out[key] = String(value)
  })
  return out
}

const normalizeFieldKey = (raw) =>
  String(raw || '')
    .trim()
    .toLowerCase()

const buildFieldsBySchema = (record = {}, fieldSchema = []) => {
  const flattened = flattenRecord(record)
  const flattenedMap = {}
  Object.entries(flattened).forEach(([key, value]) => {
    flattenedMap[normalizeFieldKey(key)] = String(value).trim()
  })

  const values = {}
  const hasExplicit = {}
  fieldSchema.forEach((field) => {
    const aliases = [field.key, ...(field.aliases || [])]
    const matched = aliases
      .map((alias) => flattenedMap[normalizeFieldKey(alias)] || '')
      .find((value) => value !== '')
    hasExplicit[field.key] = Boolean(matched)
    values[field.key] = matched || field.defaultValue || ''
  })
  return { values, hasExplicit, flattenedMap }
}

const parseNumericValue = (raw) => {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return raw
  }
  const text = String(raw ?? '')
    .trim()
    .replaceAll(',', '')
    .replace(/[^0-9.-]/g, '')
  if (!text || text === '-' || text === '.' || text === '-.') {
    return Number.NaN
  }
  const parsed = Number(text)
  return Number.isFinite(parsed) ? parsed : Number.NaN
}

const formatUSDMoney = (raw, fractionDigits = 2) => {
  const numeric = parseNumericValue(raw)
  if (Number.isNaN(numeric)) {
    return ''
  }
  return `US$${numeric.toFixed(fractionDigits)}`
}

const formatDollarMoney = (raw, fractionDigits = 4) => {
  const numeric = parseNumericValue(raw)
  if (Number.isNaN(numeric)) {
    return ''
  }
  return `$${numeric.toFixed(fractionDigits)}`
}

const SMALL_NUMBER_WORDS = [
  'ZERO',
  'ONE',
  'TWO',
  'THREE',
  'FOUR',
  'FIVE',
  'SIX',
  'SEVEN',
  'EIGHT',
  'NINE',
  'TEN',
  'ELEVEN',
  'TWELVE',
  'THIRTEEN',
  'FOURTEEN',
  'FIFTEEN',
  'SIXTEEN',
  'SEVENTEEN',
  'EIGHTEEN',
  'NINETEEN',
]

const TENS_NUMBER_WORDS = [
  '',
  '',
  'TWENTY',
  'THIRTY',
  'FORTY',
  'FIFTY',
  'SIXTY',
  'SEVENTY',
  'EIGHTY',
  'NINETY',
]

const numberToWordsUnder1000 = (value) => {
  const numeric = Math.floor(Math.abs(value))
  if (numeric < 20) {
    return SMALL_NUMBER_WORDS[numeric]
  }
  if (numeric < 100) {
    const tens = Math.floor(numeric / 10)
    const ones = numeric % 10
    return ones
      ? `${TENS_NUMBER_WORDS[tens]} ${SMALL_NUMBER_WORDS[ones]}`
      : TENS_NUMBER_WORDS[tens]
  }
  const hundreds = Math.floor(numeric / 100)
  const rest = numeric % 100
  return rest
    ? `${SMALL_NUMBER_WORDS[hundreds]} HUNDRED ${numberToWordsUnder1000(rest)}`
    : `${SMALL_NUMBER_WORDS[hundreds]} HUNDRED`
}

const numberToEnglishWords = (raw) => {
  const numeric = parseNumericValue(raw)
  if (Number.isNaN(numeric)) {
    return ''
  }
  if (numeric === 0) {
    return 'ZERO'
  }

  const negative = numeric < 0
  let remaining = Math.floor(Math.abs(numeric))
  const chunks = [
    { base: 1000000000, label: 'BILLION' },
    { base: 1000000, label: 'MILLION' },
    { base: 1000, label: 'THOUSAND' },
  ]
  const parts = []
  chunks.forEach(({ base, label }) => {
    if (remaining >= base) {
      const chunk = Math.floor(remaining / base)
      parts.push(`${numberToWordsUnder1000(chunk)} ${label}`)
      remaining -= chunk * base
    }
  })
  if (remaining > 0) {
    parts.push(numberToWordsUnder1000(remaining))
  }
  const joined = parts.join(' ').replace(/\s+/g, ' ').trim()
  return negative ? `MINUS ${joined}` : joined
}

const toUSDWords = (raw) => {
  const numeric = parseNumericValue(raw)
  if (Number.isNaN(numeric)) {
    return ''
  }
  const abs = Math.abs(numeric)
  const whole = Math.floor(abs)
  const cents = Math.round((abs - whole) * 100)
  const wholeWords = numberToEnglishWords(whole)
  if (cents > 0) {
    return `SAY US DOLLARS ${wholeWords} AND ${String(cents).padStart(2, '0')}/100 ONLY`
  }
  return `SAY US DOLLARS ${wholeWords} ONLY`
}

const normalizeEnglishDateValue = (raw) => {
  const text = String(raw || '').trim()
  if (!text) {
    return ''
  }

  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ]

  if (/^\d{10,13}$/.test(text)) {
    const ts = Number(text)
    if (!Number.isNaN(ts)) {
      const millis = text.length === 10 ? ts * 1000 : ts
      const dateFromTs = new Date(millis)
      if (!Number.isNaN(dateFromTs.getTime())) {
        return `${months[dateFromTs.getMonth()]} ${dateFromTs.getDate()}, ${dateFromTs.getFullYear()}`
      }
    }
  }

  const dateMatch = text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/)
  if (dateMatch) {
    const year = Number(dateMatch[1])
    const month = Number(dateMatch[2])
    const day = Number(dateMatch[3])
    if (month >= 1 && month <= 12) {
      return `${months[month - 1]} ${day}, ${year}`
    }
  }

  const parsed = new Date(text)
  if (!Number.isNaN(parsed.getTime())) {
    return `${months[parsed.getMonth()]} ${parsed.getDate()}, ${parsed.getFullYear()}`
  }
  return text
}

export const PROFORMA_INVOICE_FIELD_SCHEMA = [
  {
    key: 'headerCompanyName',
    label: '顶部公司名',
    defaultValue: 'HANGZHOU KESEN MAGNETICS CO., LTD.',
    aliases: ['header_company_name', 'company_name_en', 'companynameen'],
  },
  {
    key: 'headerAddressLine1',
    label: '顶部地址行1',
    defaultValue: '288 YONGJIU ROAD,HANGZHOU',
    aliases: ['header_address_line1', 'address_line_1_en', 'addressline1en'],
  },
  {
    key: 'headerAddressLine2',
    label: '顶部地址行2',
    defaultValue: 'ZHEJIANG 311202,CHINA',
    aliases: ['header_address_line2', 'address_line_2_en', 'addressline2en'],
  },
  {
    key: 'headerPhone',
    label: '顶部电话',
    defaultValue: 'PHONE: +86 571 8679 0529',
    aliases: ['header_phone', 'phone', 'contact_phone', 'contacttel'],
  },
  {
    key: 'headerWebsite',
    label: '顶部网址',
    defaultValue: 'WWW.KSMAGNETIC.COM',
    aliases: ['header_website', 'website', 'web', 'url'],
  },
  {
    key: 'title',
    label: '标题',
    defaultValue: 'PROFORMA INVOICE',
    aliases: ['title', 'doc_title'],
  },
  {
    key: 'buyerCompanyName',
    label: '买方公司名',
    defaultValue: "(Buyer's Company Name)",
    aliases: ['buyer_company_name', 'customername', 'customer_name', 'name'],
  },
  {
    key: 'buyerAddressTel',
    label: '买方地址电话',
    defaultValue: '(Address & Tel.)',
    aliases: [
      'buyer_address_tel',
      'customer_address_tel',
      'customeraddress',
      'address',
    ],
  },
  {
    key: 'invoiceNo',
    label: 'Invoice No.',
    defaultValue: 'KSMPI20260115001',
    aliases: ['invoice_no', 'invoiceno', 'code', 'pi_no', 'pi'],
  },
  {
    key: 'orderNo',
    label: 'Order No.',
    defaultValue: 'KSMPI20260115001',
    aliases: [
      'order_no',
      'orderno',
      'customer_contract_no',
      'customercontractno',
    ],
  },
  {
    key: 'date',
    label: 'Date',
    defaultValue: 'January 15, 2026',
    aliases: [
      'date',
      'sign_date',
      'signdate',
      'order_date',
      'orderdate',
      'quoteddate',
      'created_at',
    ],
  },
  {
    key: 'email',
    label: 'Email',
    defaultValue: 'info@ksmagnetic.com',
    aliases: ['email', 'contact_email', 'contactemail'],
  },
  {
    key: 'item1No',
    label: '条目1-序号',
    defaultValue: '1',
    aliases: ['item1_no', 'line1_no'],
  },
  {
    key: 'item1Ref',
    label: '条目1-Ref',
    defaultValue: 'I1001I',
    aliases: ['item1_ref', 'line1_ref'],
  },
  {
    key: 'item1Desc',
    label: '条目1-品名',
    defaultValue:
      'NDFEB DISC MAGNET, N35, D9,5X1,5MM, NICKEL COATING, PLASTIC TUBE PACKING, 10PCS/TUBE',
    aliases: ['item1_desc', 'line1_desc'],
  },
  {
    key: 'item1Qty',
    label: '条目1-数量',
    defaultValue: '1',
    aliases: ['item1_qty', 'line1_qty'],
  },
  {
    key: 'item1NetPrice',
    label: '条目1-单价',
    defaultValue: '$1.0000',
    aliases: ['item1_net_price', 'line1_net_price'],
  },
  {
    key: 'item1NetValue',
    label: '条目1-金额',
    defaultValue: 'US$1.00',
    aliases: ['item1_net_value', 'line1_net_value'],
  },
  {
    key: 'item2No',
    label: '条目2-序号',
    defaultValue: '2',
    aliases: ['item2_no', 'line2_no'],
  },
  {
    key: 'item2Ref',
    label: '条目2-Ref',
    defaultValue: 'I1002I',
    aliases: ['item2_ref', 'line2_ref'],
  },
  {
    key: 'item2Desc',
    label: '条目2-品名',
    defaultValue:
      'NDFEB DISC MAGNET, N35, D10X3MM, NICKEL COATING, PLASTIC TUBE PACKING, 10PCS/TUBE',
    aliases: ['item2_desc', 'line2_desc'],
  },
  {
    key: 'item2Qty',
    label: '条目2-数量',
    defaultValue: '1',
    aliases: ['item2_qty', 'line2_qty'],
  },
  {
    key: 'item2NetPrice',
    label: '条目2-单价',
    defaultValue: '$1.0000',
    aliases: ['item2_net_price', 'line2_net_price'],
  },
  {
    key: 'item2NetValue',
    label: '条目2-金额',
    defaultValue: 'US$1.00',
    aliases: ['item2_net_value', 'line2_net_value'],
  },
  {
    key: 'totalNetValue',
    label: '合计金额',
    defaultValue: 'US$2.00',
    aliases: ['total_net_value', 'total_amount', 'totalamount'],
  },
  {
    key: 'amountInWords',
    label: '金额大写',
    defaultValue: 'SAY US DOLLARS *** ONLY',
    aliases: ['amount_in_words', 'amount_words'],
  },
  {
    key: 'incoterms',
    label: 'Incoterms',
    defaultValue: 'DAP Barcelona,Spain',
    aliases: ['incoterms', 'price_term', 'priceterm'],
  },
  {
    key: 'deliveryMethod',
    label: 'Delivery Method',
    defaultValue: 'By FedEx',
    aliases: [
      'delivery_method',
      'transport_type',
      'transporttype',
      'deliverymethod',
    ],
  },
  {
    key: 'leadTime',
    label: 'Lead-time',
    defaultValue: '2-5 Days',
    aliases: ['lead_time', 'leadtime', 'delivery_cycle'],
  },
  {
    key: 'paymentTerms',
    label: 'Payment Terms',
    defaultValue: 'T/T 30% deposit and 70% against the copy of B/L',
    aliases: [
      'payment_terms',
      'paymentterms',
      'payment_method',
      'paymentmethod',
    ],
  },
  {
    key: 'notes',
    label: 'Notes',
    defaultValue: '',
    aliases: ['notes', 'remark'],
  },
  {
    key: 'authorizedBuyer',
    label: '买方签章标题',
    defaultValue: 'Authorized Signature Buyer',
    aliases: ['authorized_buyer', 'buyer_signature_label'],
  },
  {
    key: 'authorizedSeller',
    label: '卖方签章标题',
    defaultValue: 'Authorized Signature Seller',
    aliases: ['authorized_seller', 'seller_signature_label'],
  },
  {
    key: 'sellerCompanyEn',
    label: '卖方签章英文',
    defaultValue: 'HANGZHOU KESEN MAGNETICS CO., LTD.',
    aliases: ['seller_company_en', 'company_name_en'],
  },
  {
    key: 'sellerCompanyCn',
    label: '卖方签章中文',
    defaultValue: '杭州科森磁材有限公司',
    aliases: ['seller_company_cn', 'company_name_cn'],
  },
  {
    key: 'sellerSigner',
    label: '卖方签字',
    defaultValue: 'Gina Liu',
    aliases: ['seller_signer', 'signer'],
  },
  {
    key: 'bankName',
    label: 'BANK NAME',
    defaultValue: 'THE AGRICULTURAL BANK OF CHINA XIAOSHAN BR.',
    aliases: ['bank_name', 'bankname'],
  },
  {
    key: 'bankAddress1',
    label: 'BANK ADDRESS 行1',
    defaultValue: 'NO. 88 HAOYUE ROAD XIAOSHAN DISTRICT',
    aliases: ['bank_address_1', 'bankaddress1'],
  },
  {
    key: 'bankAddress2',
    label: 'BANK ADDRESS 行2',
    defaultValue: 'HANGZHOU ZHEJIANG CHINA',
    aliases: ['bank_address_2', 'bankaddress2'],
  },
  {
    key: 'beneficiaryName',
    label: 'BENEFICIARY NAME',
    defaultValue: 'HANGZHOU KESEN MAGNETICS CO., LTD.',
    aliases: ['beneficiary_name', 'beneficiaryname'],
  },
  {
    key: 'beneficiaryAddress',
    label: 'BENEFICIARY ADDRESS',
    defaultValue: '288 YONGJIU ROAD,HANGZHOU,ZHEJIANG 311202 CHINA',
    aliases: ['beneficiary_address', 'beneficiaryaddress'],
  },
  {
    key: 'accountUsd',
    label: 'A/C NO. USD',
    defaultValue: '19085014040030909',
    aliases: ['account_usd', 'ac_no_usd', 'acusd'],
  },
  {
    key: 'accountEuro',
    label: 'A/C NO. EURO',
    defaultValue: '19085038040006163',
    aliases: ['account_euro', 'ac_no_euro', 'aceuro'],
  },
  {
    key: 'swiftCode',
    label: 'SWIFT CODE',
    defaultValue: 'ABOCCNBJ110',
    aliases: ['swift_code', 'swiftcode'],
  },
]

const DEFAULT_PROFORMA_INVOICE_ITEMS = [
  {
    no: '1',
    ref: 'I1001I',
    description:
      'NDFEB DISC MAGNET, N35, D9,5X1,5MM, NICKEL COATING, PLASTIC TUBE PACKING, 10PCS/TUBE',
    quantity: 1,
    netPrice: 1,
    netValue: 1,
  },
  {
    no: '2',
    ref: 'I1002I',
    description:
      'NDFEB DISC MAGNET, N35, D10X3MM, NICKEL COATING, PLASTIC TUBE PACKING, 10PCS/TUBE',
    quantity: 1,
    netPrice: 1,
    netValue: 1,
  },
]

export const PROFORMA_PAGE_WIDTH = 1414
export const PROFORMA_PAGE_HEIGHT = 2000
export const PROFORMA_CANVAS_WIDTH = 1269
export const PROFORMA_CANVAS_HEIGHT = 1370
export const PROFORMA_CANVAS_OFFSET_LEFT = 70
export const PROFORMA_CANVAS_OFFSET_TOP = 64

export const buildProformaInvoiceFields = (record = {}) => {
  const { values, hasExplicit, flattenedMap } = buildFieldsBySchema(
    record,
    PROFORMA_INVOICE_FIELD_SCHEMA
  )
  const recordItems = Array.isArray(record?.items)
    ? record.items.slice(0, 2)
    : []

  if (!hasExplicit.buyerCompanyName) {
    values.buyerCompanyName =
      flattenedMap.customername ||
      flattenedMap.name ||
      flattenedMap.partnername ||
      values.buyerCompanyName
  }

  if (!hasExplicit.buyerAddressTel) {
    const address =
      flattenedMap.customeraddress ||
      flattenedMap.shiptoaddress ||
      flattenedMap.address ||
      ''
    const contact =
      flattenedMap.contacttel ||
      flattenedMap.contactphone ||
      flattenedMap.contact ||
      flattenedMap.phone ||
      ''
    const combined = [address, contact].filter(Boolean).join(' ')
    if (combined) {
      values.buyerAddressTel = combined
    }
  }

  if (!hasExplicit.invoiceNo) {
    values.invoiceNo =
      flattenedMap.code || flattenedMap.invoiceno || values.invoiceNo
  }
  if (!hasExplicit.orderNo) {
    values.orderNo =
      flattenedMap.orderno ||
      flattenedMap.customercontractno ||
      flattenedMap.customer_contract_no ||
      flattenedMap.code ||
      values.orderNo
  }
  if (!hasExplicit.date) {
    values.date =
      flattenedMap.signdate ||
      flattenedMap.sign_date ||
      flattenedMap.orderdate ||
      flattenedMap.order_date ||
      flattenedMap.quoteddate ||
      flattenedMap.created_at ||
      values.date
  }
  if (!hasExplicit.email) {
    values.email =
      flattenedMap.contactemail ||
      flattenedMap.contact_email ||
      flattenedMap.email ||
      flattenedMap.mail ||
      values.email
  }
  if (!hasExplicit.incoterms) {
    const term = flattenedMap.priceterm || flattenedMap.price_term || ''
    const place = flattenedMap.endplace || flattenedMap.end_place || ''
    const combined = term && place ? `${term} ${place}` : term || place
    if (combined) {
      values.incoterms = combined
    }
  }
  if (!hasExplicit.deliveryMethod) {
    const transport =
      flattenedMap.transporttype ||
      flattenedMap.transport_type ||
      flattenedMap.deliverymethod ||
      values.deliveryMethod
    values.deliveryMethod = transport
      ? `By ${transport}`
      : values.deliveryMethod
  }
  if (!hasExplicit.leadTime) {
    values.leadTime =
      flattenedMap.leadtime || flattenedMap.deliverycycle || values.leadTime
  }
  if (!hasExplicit.paymentTerms) {
    const payment =
      flattenedMap.paymentmethod || flattenedMap.payment_method || ''
    if (payment) {
      values.paymentTerms = payment
    }
  }
  if (!hasExplicit.notes) {
    values.notes = flattenedMap.remark || values.notes
  }

  const mappedItems = DEFAULT_PROFORMA_INVOICE_ITEMS.map((fallback, index) => {
    const source = recordItems[index] || {}
    const quantity = parseNumericValue(source.quantity)
    const netPrice = parseNumericValue(
      source.netPrice ?? source.unitPrice ?? source.price
    )
    const explicitNetValue = parseNumericValue(
      source.netValue ?? source.totalPrice ?? source.amount
    )
    const normalizedQuantity = Number.isNaN(quantity)
      ? fallback.quantity
      : quantity
    const normalizedNetPrice = Number.isNaN(netPrice)
      ? fallback.netPrice
      : netPrice
    const normalizedNetValue = Number.isNaN(explicitNetValue)
      ? normalizedQuantity * normalizedNetPrice
      : explicitNetValue

    return {
      no: String(index + 1),
      ref: String(
        source.refNo ||
          source.ref ||
          source.productCode ||
          source.specCode ||
          fallback.ref
      ),
      description: String(
        source.enDesc ||
          source.goodsDescription ||
          source.productName ||
          source.productModel ||
          source.cnDesc ||
          fallback.description
      ),
      quantity: normalizedQuantity,
      netPrice: normalizedNetPrice,
      netValue: normalizedNetValue,
    }
  })

  const applyRowValues = (index) => {
    const row = mappedItems[index - 1]
    if (!row) {
      return
    }
    if (!hasExplicit[`item${index}No`]) {
      values[`item${index}No`] = row.no
    }
    if (!hasExplicit[`item${index}Ref`]) {
      values[`item${index}Ref`] = row.ref
    }
    if (!hasExplicit[`item${index}Desc`]) {
      values[`item${index}Desc`] = row.description
    }
    if (!hasExplicit[`item${index}Qty`]) {
      values[`item${index}Qty`] = String(row.quantity)
    }
    if (!hasExplicit[`item${index}NetPrice`]) {
      values[`item${index}NetPrice`] = formatDollarMoney(row.netPrice, 4)
    } else {
      const normalizedNetPrice = parseNumericValue(
        values[`item${index}NetPrice`]
      )
      if (!Number.isNaN(normalizedNetPrice)) {
        values[`item${index}NetPrice`] = formatDollarMoney(
          normalizedNetPrice,
          4
        )
      }
    }
    if (!hasExplicit[`item${index}NetValue`]) {
      values[`item${index}NetValue`] = formatUSDMoney(row.netValue, 2)
    } else {
      const normalizedNetValue = parseNumericValue(
        values[`item${index}NetValue`]
      )
      if (!Number.isNaN(normalizedNetValue)) {
        values[`item${index}NetValue`] = formatUSDMoney(normalizedNetValue, 2)
      }
    }
  }

  applyRowValues(1)
  applyRowValues(2)

  const totalFromItems = mappedItems.reduce(
    (sum, item) => sum + item.netValue,
    0
  )
  const explicitTotal = hasExplicit.totalNetValue
    ? parseNumericValue(values.totalNetValue)
    : Number.NaN
  const normalizedTotal = Number.isNaN(explicitTotal)
    ? totalFromItems
    : explicitTotal
  if (!hasExplicit.totalNetValue) {
    values.totalNetValue = formatUSDMoney(normalizedTotal, 2)
  } else if (
    values.totalNetValue &&
    !String(values.totalNetValue).includes('US$')
  ) {
    values.totalNetValue = formatUSDMoney(values.totalNetValue, 2)
  }

  if (!hasExplicit.amountInWords) {
    const amountWords = toUSDWords(normalizedTotal)
    values.amountInWords = amountWords || values.amountInWords
  }

  if (
    values.headerPhone &&
    !String(values.headerPhone).toUpperCase().startsWith('PHONE:')
  ) {
    values.headerPhone = `PHONE: ${values.headerPhone}`
  }
  values.headerWebsite =
    String(values.headerWebsite || '')
      .trim()
      .toUpperCase() || 'WWW.KSMAGNETIC.COM'
  values.title = String(values.title || 'PROFORMA INVOICE')
    .trim()
    .toUpperCase()
  values.date = normalizeEnglishDateValue(values.date)
  const normalizedDeliveryMethod = String(values.deliveryMethod || '').trim()
  if (!normalizedDeliveryMethod) {
    values.deliveryMethod = 'By FedEx'
  } else if (/^by\s+/i.test(normalizedDeliveryMethod)) {
    values.deliveryMethod = normalizedDeliveryMethod
  } else {
    values.deliveryMethod = `By ${normalizedDeliveryMethod}`
  }
  return values
}

export const buildProformaInvoiceTemplateHTML = (
  record = {},
  {
    logoSrc = '/templates/billing-info-logo.png',
    signatureSrc = '/templates/proforma-signature.png',
  } = {}
) => {
  const fields = buildProformaInvoiceFields(record)
  const buildEditableNode = (fieldKey, className = '', multiline = false) => {
    const value = String(fields[fieldKey] || '')
    return `
      <div class="proforma-editable ${className}" data-billing-field="${escapeHTML(fieldKey)}" data-default="${escapeHTML(value)}" contenteditable="true" spellcheck="false"${multiline ? ' data-multiline="true"' : ''}>${escapeHTML(value)}</div>
    `
  }

  // 卖方签章按模板要求使用图片渲染，避免字体替代导致签章区域错位。
  return `
    <section class="proforma-template">
      <article class="proforma-paper">
        <div class="proforma-sheet" role="img" aria-label="外销形式发票模板">
          <header class="proforma-header">
            <div class="proforma-header-left">
              ${buildEditableNode('headerCompanyName', 'proforma-header-company')}
              ${buildEditableNode('headerAddressLine1', 'proforma-header-address')}
              ${buildEditableNode('headerAddressLine2', 'proforma-header-address')}
              ${buildEditableNode('headerPhone', 'proforma-header-phone')}
            </div>
            <div class="proforma-header-right">
              <img class="proforma-logo" src="${escapeHTML(logoSrc)}" alt="KS MAGNETICS" draggable="false" />
              ${buildEditableNode('headerWebsite', 'proforma-header-website')}
            </div>
          </header>

          <div class="proforma-meta-box">
            <div class="proforma-title-wrap">
              ${buildEditableNode('title', 'proforma-title')}
            </div>

            <section class="proforma-meta">
              <div class="proforma-buyer">
                ${buildEditableNode('buyerCompanyName', 'proforma-buyer-company')}
                ${buildEditableNode('buyerAddressTel', 'proforma-buyer-address', true)}
              </div>
              <table class="proforma-meta-table">
                <tbody>
                  <tr>
                    <th>Invoice No.:</th>
                    <td>${buildEditableNode('invoiceNo')}</td>
                  </tr>
                  <tr>
                    <th>Order No.:</th>
                    <td>${buildEditableNode('orderNo')}</td>
                  </tr>
                  <tr>
                    <th>Date:</th>
                    <td>${buildEditableNode('date')}</td>
                  </tr>
                  <tr>
                    <th>Email:</th>
                    <td>${buildEditableNode('email')}</td>
                  </tr>
                </tbody>
              </table>
            </section>
          </div>

          <table class="proforma-items-table">
            <colgroup>
              <col style="width:7.587%" />
              <col style="width:10.199%" />
              <col style="width:38.557%" />
              <col style="width:13.308%" />
              <col style="width:11.94%" />
              <col style="width:18.408%" />
            </colgroup>
            <thead>
              <tr>
                <th>Item</th>
                <th>Ref. No.</th>
                <th>Goods Description</th>
                <th>Quantity</th>
                <th>Net Price</th>
                <th>Net Value</th>
              </tr>
            </thead>
            <tbody>
              <tr class="proforma-item-row">
                <td>${buildEditableNode('item1No', 'proforma-cell-center')}</td>
                <td>${buildEditableNode('item1Ref', 'proforma-cell-center')}</td>
                <td>${buildEditableNode('item1Desc', 'proforma-cell-left', true)}</td>
                <td>${buildEditableNode('item1Qty', 'proforma-cell-center')}</td>
                <td>${buildEditableNode('item1NetPrice', 'proforma-cell-right')}</td>
                <td>${buildEditableNode('item1NetValue', 'proforma-cell-right')}</td>
              </tr>
              <tr class="proforma-item-row">
                <td>${buildEditableNode('item2No', 'proforma-cell-center')}</td>
                <td>${buildEditableNode('item2Ref', 'proforma-cell-center')}</td>
                <td>${buildEditableNode('item2Desc', 'proforma-cell-left', true)}</td>
                <td>${buildEditableNode('item2Qty', 'proforma-cell-center')}</td>
                <td>${buildEditableNode('item2NetPrice', 'proforma-cell-right')}</td>
                <td>${buildEditableNode('item2NetValue', 'proforma-cell-right')}</td>
              </tr>
              <tr class="proforma-total-title-row">
                <td colspan="5"><strong>Total Net Value:</strong></td>
                <td class="proforma-total-value-cell" rowspan="2">${buildEditableNode('totalNetValue', 'proforma-cell-right proforma-cell-strong')}</td>
              </tr>
              <tr class="proforma-total-words-row">
                <td colspan="5">${buildEditableNode('amountInWords', 'proforma-amount-words')}</td>
              </tr>
            </tbody>
          </table>

          <table class="proforma-terms-table">
            <tbody>
              <tr class="proforma-terms-spacer-row">
                <td colspan="4"></td>
              </tr>
              <tr class="proforma-terms-main-row">
                <th>Incoterms:</th>
                <td>${buildEditableNode('incoterms')}</td>
                <th>Delivery Method:</th>
                <td>${buildEditableNode('deliveryMethod')}</td>
              </tr>
              <tr class="proforma-terms-main-row proforma-terms-lead-row">
                <th>Lead-time:</th>
                <td>${buildEditableNode('leadTime')}</td>
                <th>Payment Terms:</th>
                <td>${buildEditableNode('paymentTerms', '', true)}</td>
              </tr>
              <tr class="proforma-terms-notes-row">
                <th>Notes:</th>
                <td colspan="3">${buildEditableNode('notes', '', true)}</td>
              </tr>
            </tbody>
          </table>

          <section class="proforma-signature-zone">
            <div class="proforma-seller-signature">
              <img
                class="proforma-seller-signature-image"
                src="${escapeHTML(signatureSrc)}"
                alt="Authorized Signature Seller"
                draggable="false"
              />
            </div>
            <div class="proforma-signature-labels">
              ${buildEditableNode('authorizedBuyer', 'proforma-signature-label')}
              ${buildEditableNode('authorizedSeller', 'proforma-signature-label')}
            </div>
          </section>

          <table class="proforma-bank-table">
            <tbody>
              <tr>
                <th>BANK NAME:</th>
                <th>BENEFICIARY NAME:</th>
                <td>${buildEditableNode('beneficiaryName')}</td>
              </tr>
              <tr>
                <td>${buildEditableNode('bankName')}</td>
                <th>ADDRESS:</th>
                <td>${buildEditableNode('beneficiaryAddress')}</td>
              </tr>
              <tr>
                <th>BANK ADDRESS:</th>
                <th>A/C NO. USD:</th>
                <td>${buildEditableNode('accountUsd')}</td>
              </tr>
              <tr>
                <td>${buildEditableNode('bankAddress1')}</td>
                <th>A/C NO. EURO:</th>
                <td>${buildEditableNode('accountEuro')}</td>
              </tr>
              <tr>
                <td>${buildEditableNode('bankAddress2')}</td>
                <th>SWIFT CODE:</th>
                <td>${buildEditableNode('swiftCode')}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>
    </section>
  `
}

export const PROFORMA_INVOICE_STYLE = `
      .template-wrap.template-wrap-proforma-fit {
        overflow: hidden;
      }
      .template-wrap .proforma-template {
        display: flex;
        justify-content: center;
        min-height: 100%;
        padding: 24px 0;
        background: #d9d9d9;
      }
      .template-wrap.template-wrap-proforma-fit .proforma-template {
        position: relative;
        align-items: flex-start;
        min-height: 0;
        padding: 0;
      }
      .template-wrap .proforma-paper {
        width: ${PROFORMA_PAGE_WIDTH}px;
        height: ${PROFORMA_PAGE_HEIGHT}px;
        position: relative;
        background: #fff;
        box-shadow: 0 2px 14px rgba(0, 0, 0, 0.2);
        font-family: Arial, Helvetica, sans-serif;
        color: #111;
      }
      .template-wrap.template-wrap-proforma-fit .proforma-paper {
        position: absolute;
        left: 50%;
        top: 0;
        transform-origin: top center;
      }
      .template-wrap .proforma-sheet {
        position: absolute;
        left: ${PROFORMA_CANVAS_OFFSET_LEFT}px;
        top: ${PROFORMA_CANVAS_OFFSET_TOP}px;
        width: ${PROFORMA_CANVAS_WIDTH}px;
        height: ${PROFORMA_CANVAS_HEIGHT}px;
        border: 0;
        background: #fff;
      }
      .template-wrap .proforma-editable {
        display: block;
        position: relative;
        z-index: 1;
        outline: 1px dashed transparent;
        border-radius: 2px;
        min-height: 20px;
        line-height: 1.18;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .template-wrap .proforma-editable[data-multiline="true"] {
        white-space: pre-wrap;
        overflow: visible;
        text-overflow: initial;
      }
      .template-wrap .proforma-editable:focus {
        outline-color: #1f7a3f;
        background: rgba(31, 122, 63, 0.08);
      }
      .template-wrap .proforma-header {
        display: flex;
        justify-content: space-between;
        padding: 6px 10px 0;
      }
      .template-wrap .proforma-header-left {
        flex: 1;
      }
      .template-wrap .proforma-header-company {
        font-size: 16px;
        font-weight: 700;
      }
      .template-wrap .proforma-header-address {
        margin-top: 4px;
        font-size: 12.5px;
      }
      .template-wrap .proforma-header-phone {
        margin-top: 5px;
        font-size: 13.5px;
      }
      .template-wrap .proforma-header-right {
        width: 382px;
        text-align: right;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
      }
      .template-wrap .proforma-logo {
        width: 365px;
        max-width: 100%;
        margin-top: 0;
        user-select: none;
        -webkit-user-drag: none;
      }
      .template-wrap .proforma-header-website {
        margin-top: 6px;
        font-size: 13.3px;
        text-align: center;
        width: 100%;
        padding-right: 10px;
      }
      .template-wrap .proforma-meta-box {
        border-top: 2.6px solid #000;
      }
      .template-wrap .proforma-title-wrap {
        padding: 9px 0 4px;
        text-align: center;
      }
      .template-wrap .proforma-title {
        font-size: 23.5px;
        font-weight: 700;
        letter-spacing: 0.3px;
      }
      .template-wrap .proforma-meta {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        padding: 4px 10px 4px;
        min-height: 199px;
      }
      .template-wrap .proforma-buyer {
        flex: 1;
        min-height: 100%;
      }
      .template-wrap .proforma-buyer-company {
        font-size: 17px;
        font-weight: 700;
      }
      .template-wrap .proforma-buyer-address {
        margin-top: 6px;
        font-size: 13.5px;
      }
      .template-wrap .proforma-meta-table {
        width: 42%;
        border-collapse: collapse;
        table-layout: fixed;
      }
      .template-wrap .proforma-meta-table th,
      .template-wrap .proforma-meta-table td {
        border: 0;
        padding: 3px 5px;
        vertical-align: top;
      }
      .template-wrap .proforma-meta-table th {
        width: 35%;
        text-align: left;
        white-space: nowrap;
        font-size: 12.7px;
        font-weight: 700;
      }
      .template-wrap .proforma-meta-table td {
        font-size: 12.7px;
      }
      .template-wrap .proforma-items-table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
        border: 3.2px solid #000;
      }
      .template-wrap .proforma-items-table th,
      .template-wrap .proforma-items-table td {
        border: 1.6px solid #000;
        padding: 4px 8px;
        font-size: 13px;
        vertical-align: middle;
      }
      .template-wrap .proforma-items-table thead tr {
        height: 76px;
      }
      .template-wrap .proforma-item-row {
        height: 101px;
      }
      .template-wrap .proforma-items-table th {
        text-align: center;
        font-weight: 700;
      }
      .template-wrap .proforma-cell-left {
        text-align: left;
      }
      .template-wrap .proforma-cell-center {
        text-align: center;
      }
      .template-wrap .proforma-cell-right {
        text-align: right;
      }
      .template-wrap .proforma-cell-strong {
        font-weight: 700;
      }
      .template-wrap .proforma-total-title-row td {
        height: 49px;
        font-size: 13.3px;
        font-weight: 700;
        border-bottom: 0;
      }
      .template-wrap .proforma-total-words-row td {
        height: 64px;
        font-size: 13.3px;
        font-weight: 700;
        border-top: 0;
      }
      .template-wrap .proforma-total-value-cell {
        vertical-align: middle !important;
      }
      .template-wrap .proforma-amount-words {
        white-space: normal;
      }
      .template-wrap .proforma-terms-table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
        border: 3.2px solid #000;
        border-top: 0;
      }
      .template-wrap .proforma-terms-table th,
      .template-wrap .proforma-terms-table td {
        border: 1.6px solid #000;
        padding: 4px 6px;
        vertical-align: middle;
        font-size: 13px;
      }
      .template-wrap .proforma-terms-spacer-row {
        height: 30px;
      }
      .template-wrap .proforma-terms-main-row {
        height: 58px;
      }
      .template-wrap .proforma-terms-lead-row {
        height: 71px;
      }
      .template-wrap .proforma-terms-notes-row {
        height: 61px;
      }
      .template-wrap .proforma-terms-table th {
        width: 18%;
        text-align: left;
        font-weight: 700;
      }
      .template-wrap .proforma-terms-table td {
        width: 32%;
      }
      .template-wrap .proforma-signature-zone {
        padding: 16px 14px 8px;
        height: 249px;
      }
      .template-wrap .proforma-seller-signature {
        width: 51%;
        margin: 0 auto;
      }
      .template-wrap .proforma-seller-signature-image {
        display: block;
        width: 100%;
        height: auto;
        user-select: none;
        -webkit-user-drag: none;
        pointer-events: none;
      }
      .template-wrap .proforma-signature-labels {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        margin-top: 14px;
      }
      .template-wrap .proforma-signature-label {
        flex: 1;
        font-size: 13.5px;
        font-weight: 700;
      }
      .template-wrap .proforma-bank-table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
        border-top: 3.2px solid #000;
      }
      .template-wrap .proforma-bank-table th,
      .template-wrap .proforma-bank-table td {
        padding: 3px 6px;
        text-align: left;
        vertical-align: top;
        border: 0;
      }
      .template-wrap .proforma-bank-table th {
        font-size: 13px;
        font-weight: 700;
      }
      .template-wrap .proforma-bank-table td {
        font-size: 13px;
      }
`

export const buildProformaInvoiceStandaloneHTML = (
  record = {},
  { logoSrc, signatureSrc } = {}
) => `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>PI Pixel Diff</title>
    <style>
      * { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; background: #fff; }
      .template-wrap { width: ${PROFORMA_PAGE_WIDTH}px; height: ${PROFORMA_PAGE_HEIGHT}px; overflow: hidden; }
      .template-wrap .proforma-template { padding: 0; background: #fff; justify-content: flex-start; }
      .template-wrap .proforma-paper { box-shadow: none; }
      ${PROFORMA_INVOICE_STYLE}
    </style>
  </head>
  <body>
    <section class="template-wrap">
      ${buildProformaInvoiceTemplateHTML(record, { logoSrc, signatureSrc })}
    </section>
  </body>
</html>
`
