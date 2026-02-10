import * as XLSX from 'xlsx'
import { AUTH_SCOPE, getToken } from '@/common/auth/auth'

export const templateList = [
  { key: 'quotation', title: '报价单' },
  { key: 'pi', title: '形式发票 PI' },
  { key: 'purchase', title: '采购合同' },
  { key: 'invoice', title: '商业发票 Commercial Invoice' },
  { key: 'packing', title: '装箱单 Packing List' },
  { key: 'delivery', title: '送货单' },
  { key: 'production', title: '生产加工申请单' },
  { key: 'billingInfo', title: '开票信息' },
]

const DEFAULT_TEMPLATE_ASSET_MAP = {
  quotation: '/templates/export-invoice-template.xls',
  pi: '/templates/export-invoice-template.xls',
  purchase: '/templates/purchase-contract-template.xls',
  invoice: '/templates/export-invoice-template.xls',
  packing: '/templates/export-invoice-template.xls',
  delivery: '/templates/export-invoice-template.xls',
  production: '/templates/export-invoice-template.xls',
  billingInfo: '/templates/billing-info-template.html',
}

const EXCEL_XLS_MAGIC = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]
const EXCEL_XLSX_MAGIC = [0x50, 0x4b, 0x03, 0x04]
const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46]
const FIXED_LAYOUT_TEMPLATE_KEYS = new Set(['billingInfo', 'pi', 'purchase'])

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

const normalizeFieldKey = (raw) => String(raw || '').trim().toLowerCase()

const normalizeBillingDateValue = (raw) => {
  const text = String(raw || '').trim()
  if (!text) {
    return ''
  }

  if (/^\d{10,13}$/.test(text)) {
    const ts = Number(text)
    if (!Number.isNaN(ts)) {
      const millis = text.length === 10 ? ts * 1000 : ts
      const dateFromTs = new Date(millis)
      if (!Number.isNaN(dateFromTs.getTime())) {
        return `${dateFromTs.getFullYear()}年${dateFromTs.getMonth() + 1}月${dateFromTs.getDate()}日`
      }
    }
  }

  const dateMatch = text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/)
  if (dateMatch) {
    return `${Number(dateMatch[1])}年${Number(dateMatch[2])}月${Number(dateMatch[3])}日`
  }
  return text
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

const TENS_NUMBER_WORDS = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY']

const numberToWordsUnder1000 = (value) => {
  const numeric = Math.floor(Math.abs(value))
  if (numeric < 20) {
    return SMALL_NUMBER_WORDS[numeric]
  }
  if (numeric < 100) {
    const tens = Math.floor(numeric / 10)
    const ones = numeric % 10
    return ones ? `${TENS_NUMBER_WORDS[tens]} ${SMALL_NUMBER_WORDS[ones]}` : TENS_NUMBER_WORDS[tens]
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

const BILLING_INFO_FIELD_SCHEMA = [
  {
    key: 'headerCompanyEn',
    label: '顶部公司英文',
    defaultValue: 'HANGZHOU KESEN MAGNETICS CO., LTD.',
    aliases: ['headercompanyen', 'companyenname', 'company_name_en', 'name_en', 'englishname'],
  },
  {
    key: 'headerAddressLine1',
    label: '顶部地址行1',
    defaultValue: '288 YONGJIU ROAD,HANGZHOU',
    aliases: ['headeraddressline1', 'addressline1en', 'address_en_line1'],
  },
  {
    key: 'headerAddressLine2',
    label: '顶部地址行2',
    defaultValue: 'ZHEJIANG 311202',
    aliases: ['headeraddressline2', 'addressline2en', 'address_en_line2'],
  },
  {
    key: 'headerCountry',
    label: '顶部国家',
    defaultValue: 'CHINA',
    aliases: ['headercountry', 'countryen', 'country'],
  },
  {
    key: 'headerPhone',
    label: '顶部电话',
    defaultValue: 'PHONE: +86 571 8679 0529',
    aliases: ['headerphone', 'header_phone', 'phone_header'],
  },
  {
    key: 'headerWebsite',
    label: '顶部网址',
    defaultValue: 'WWW.KSMAGNETIC.COM',
    aliases: ['headerwebsite', 'header_website', 'website', 'web', 'url'],
  },
  {
    key: 'titleCompanyCn',
    label: '标题公司名',
    defaultValue: '杭州科森磁材有限公司',
    aliases: ['titlecompanycn', 'title_company_cn'],
  },
  {
    key: 'titleDoc',
    label: '标题文案',
    defaultValue: '开票资料',
    aliases: ['titledoc', 'title_doc', 'doctitle', 'doc_title'],
  },
  {
    key: 'labelCompanyName',
    label: '标签-单位名称',
    defaultValue: '单位名称：',
    aliases: ['labelcompanyname', 'label_company_name'],
  },
  {
    key: 'companyName',
    label: '单位名称',
    defaultValue: '杭州科森磁材有限公司',
    aliases: ['name', 'companyname', 'company_name', 'partnername', '单位名称'],
  },
  {
    key: 'labelTaxNo',
    label: '标签-纳税人识别号',
    defaultValue: '纳税人识别号：',
    aliases: ['labeltaxno', 'label_tax_no'],
  },
  {
    key: 'taxNo',
    label: '纳税人识别号',
    defaultValue: '91330109MA7N1W9P5Y',
    aliases: ['taxno', 'tax_no', 'taxnumber', 'tax_id', '纳税人识别号'],
  },
  {
    key: 'labelAddress',
    label: '标签-地址',
    defaultValue: '地址：',
    aliases: ['labeladdress', 'label_address'],
  },
  {
    key: 'address',
    label: '地址',
    defaultValue: '浙江省杭州市萧山区北干街道永久路288号912室',
    aliases: ['address', 'addr', '注册地址', '地址'],
  },
  {
    key: 'labelPhone',
    label: '标签-电话',
    defaultValue: '电话：',
    aliases: ['labelphone', 'label_phone'],
  },
  {
    key: 'phone',
    label: '电话',
    defaultValue: '0571-86790529',
    aliases: ['contactphone', 'phone', 'tel', 'telephone', 'mobile', '电话'],
  },
  {
    key: 'labelBankName',
    label: '标签-开户行',
    defaultValue: '开户行：',
    aliases: ['labelbankname', 'label_bank_name'],
  },
  {
    key: 'bankName',
    label: '开户行',
    defaultValue: '中国农业银行杭州金城路支行',
    aliases: ['bankname', 'bank_name', '开户行', 'bank'],
  },
  {
    key: 'labelBankAccount',
    label: '标签-账号',
    defaultValue: '账号：',
    aliases: ['labelbankaccount', 'label_bank_account'],
  },
  {
    key: 'bankAccount',
    label: '账号',
    defaultValue: '19085201040039051',
    aliases: ['bankaccount', 'bank_account', 'account', '账号'],
  },
  {
    key: 'footerCompanyName',
    label: '落款公司名',
    defaultValue: '杭州科森磁材有限公司',
    aliases: ['footercompanyname', 'footer_company_name'],
  },
  {
    key: 'date',
    label: '落款日期',
    defaultValue: '2022年5月8日',
    aliases: ['date', 'invoice_date', 'invoicedate', '开票日期', 'created_at', 'updated_at'],
  },
]

const PROFORMA_INVOICE_FIELD_SCHEMA = [
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
    aliases: ['buyer_address_tel', 'customer_address_tel', 'customeraddress', 'address'],
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
    aliases: ['order_no', 'orderno', 'customer_contract_no', 'customercontractno'],
  },
  {
    key: 'date',
    label: 'Date',
    defaultValue: 'January 15, 2026',
    aliases: ['date', 'sign_date', 'signdate', 'order_date', 'orderdate', 'quoteddate', 'created_at'],
  },
  {
    key: 'email',
    label: 'Email',
    defaultValue: 'info@ksmagnetic.com',
    aliases: ['email', 'contact_email', 'contactemail'],
  },
  { key: 'item1No', label: '条目1-序号', defaultValue: '1', aliases: ['item1_no', 'line1_no'] },
  { key: 'item1Ref', label: '条目1-Ref', defaultValue: 'I1001I', aliases: ['item1_ref', 'line1_ref'] },
  {
    key: 'item1Desc',
    label: '条目1-品名',
    defaultValue: 'NDFEB DISC MAGNET, N35, D9,5X1,5MM, NICKEL COATING, PLASTIC TUBE PACKING, 10PCS/TUBE',
    aliases: ['item1_desc', 'line1_desc'],
  },
  { key: 'item1Qty', label: '条目1-数量', defaultValue: '1', aliases: ['item1_qty', 'line1_qty'] },
  { key: 'item1NetPrice', label: '条目1-单价', defaultValue: '$1.0000', aliases: ['item1_net_price', 'line1_net_price'] },
  { key: 'item1NetValue', label: '条目1-金额', defaultValue: 'US$1.00', aliases: ['item1_net_value', 'line1_net_value'] },
  { key: 'item2No', label: '条目2-序号', defaultValue: '2', aliases: ['item2_no', 'line2_no'] },
  { key: 'item2Ref', label: '条目2-Ref', defaultValue: 'I1002I', aliases: ['item2_ref', 'line2_ref'] },
  {
    key: 'item2Desc',
    label: '条目2-品名',
    defaultValue: 'NDFEB DISC MAGNET, N35, D10X3MM, NICKEL COATING, PLASTIC TUBE PACKING, 10PCS/TUBE',
    aliases: ['item2_desc', 'line2_desc'],
  },
  { key: 'item2Qty', label: '条目2-数量', defaultValue: '1', aliases: ['item2_qty', 'line2_qty'] },
  { key: 'item2NetPrice', label: '条目2-单价', defaultValue: '$1.0000', aliases: ['item2_net_price', 'line2_net_price'] },
  { key: 'item2NetValue', label: '条目2-金额', defaultValue: 'US$1.00', aliases: ['item2_net_value', 'line2_net_value'] },
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
    aliases: ['delivery_method', 'transport_type', 'transporttype', 'deliverymethod'],
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
    aliases: ['payment_terms', 'paymentterms', 'payment_method', 'paymentmethod'],
  },
  { key: 'notes', label: 'Notes', defaultValue: '', aliases: ['notes', 'remark'] },
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
    description: 'NDFEB DISC MAGNET, N35, D9,5X1,5MM, NICKEL COATING, PLASTIC TUBE PACKING, 10PCS/TUBE',
    quantity: 1,
    netPrice: 1,
    netValue: 1,
  },
  {
    no: '2',
    ref: 'I1002I',
    description: 'NDFEB DISC MAGNET, N35, D10X3MM, NICKEL COATING, PLASTIC TUBE PACKING, 10PCS/TUBE',
    quantity: 1,
    netPrice: 1,
    netValue: 1,
  },
]

const PROFORMA_PAGE_WIDTH = 1414
const PROFORMA_PAGE_HEIGHT = 2000
const PROFORMA_CANVAS_WIDTH = 1269
const PROFORMA_CANVAS_HEIGHT = 1370
const PROFORMA_CANVAS_OFFSET_LEFT = 70
const PROFORMA_CANVAS_OFFSET_TOP = 64

const buildBillingInfoFields = (record = {}) => {
  const { values, hasExplicit } = buildFieldsBySchema(record, BILLING_INFO_FIELD_SCHEMA)

  if (!hasExplicit.titleCompanyCn && values.companyName) {
    values.titleCompanyCn = values.companyName
  }
  if (!hasExplicit.footerCompanyName && values.companyName) {
    values.footerCompanyName = values.companyName
  }
  if (!hasExplicit.headerPhone && values.phone) {
    values.headerPhone = String(values.phone).toUpperCase().startsWith('PHONE:')
      ? values.phone
      : `PHONE: ${values.phone}`
  }
  values.date = normalizeBillingDateValue(values.date)
  return values
}

const buildProformaInvoiceFields = (record = {}) => {
  const { values, hasExplicit, flattenedMap } = buildFieldsBySchema(record, PROFORMA_INVOICE_FIELD_SCHEMA)
  const recordItems = Array.isArray(record?.items) ? record.items.slice(0, 2) : []

  if (!hasExplicit.buyerCompanyName) {
    values.buyerCompanyName =
      flattenedMap.customername || flattenedMap.name || flattenedMap.partnername || values.buyerCompanyName
  }

  if (!hasExplicit.buyerAddressTel) {
    const address = flattenedMap.customeraddress || flattenedMap.shiptoaddress || flattenedMap.address || ''
    const contact =
      flattenedMap.contacttel || flattenedMap.contactphone || flattenedMap.contact || flattenedMap.phone || ''
    const combined = [address, contact].filter(Boolean).join(' ')
    if (combined) {
      values.buyerAddressTel = combined
    }
  }

  if (!hasExplicit.invoiceNo) {
    values.invoiceNo = flattenedMap.code || flattenedMap.invoiceno || values.invoiceNo
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
      flattenedMap.contactemail || flattenedMap.contact_email || flattenedMap.email || flattenedMap.mail || values.email
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
      flattenedMap.transporttype || flattenedMap.transport_type || flattenedMap.deliverymethod || values.deliveryMethod
    values.deliveryMethod = transport ? `By ${transport}` : values.deliveryMethod
  }
  if (!hasExplicit.leadTime) {
    values.leadTime = flattenedMap.leadtime || flattenedMap.deliverycycle || values.leadTime
  }
  if (!hasExplicit.paymentTerms) {
    const payment = flattenedMap.paymentmethod || flattenedMap.payment_method || ''
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
    const netPrice = parseNumericValue(source.netPrice ?? source.unitPrice ?? source.price)
    const explicitNetValue = parseNumericValue(source.netValue ?? source.totalPrice ?? source.amount)
    const normalizedQuantity = Number.isNaN(quantity) ? fallback.quantity : quantity
    const normalizedNetPrice = Number.isNaN(netPrice) ? fallback.netPrice : netPrice
    const normalizedNetValue = Number.isNaN(explicitNetValue)
      ? normalizedQuantity * normalizedNetPrice
      : explicitNetValue

    return {
      no: String(index + 1),
      ref: String(source.refNo || source.ref || source.productCode || source.specCode || fallback.ref),
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
      const normalizedNetPrice = parseNumericValue(values[`item${index}NetPrice`])
      if (!Number.isNaN(normalizedNetPrice)) {
        values[`item${index}NetPrice`] = formatDollarMoney(normalizedNetPrice, 4)
      }
    }
    if (!hasExplicit[`item${index}NetValue`]) {
      values[`item${index}NetValue`] = formatUSDMoney(row.netValue, 2)
    } else {
      const normalizedNetValue = parseNumericValue(values[`item${index}NetValue`])
      if (!Number.isNaN(normalizedNetValue)) {
        values[`item${index}NetValue`] = formatUSDMoney(normalizedNetValue, 2)
      }
    }
  }

  applyRowValues(1)
  applyRowValues(2)

  const totalFromItems = mappedItems.reduce((sum, item) => sum + item.netValue, 0)
  const explicitTotal = hasExplicit.totalNetValue ? parseNumericValue(values.totalNetValue) : Number.NaN
  const normalizedTotal = Number.isNaN(explicitTotal) ? totalFromItems : explicitTotal
  if (!hasExplicit.totalNetValue) {
    values.totalNetValue = formatUSDMoney(normalizedTotal, 2)
  } else if (values.totalNetValue && !String(values.totalNetValue).includes('US$')) {
    values.totalNetValue = formatUSDMoney(values.totalNetValue, 2)
  }

  if (!hasExplicit.amountInWords) {
    const amountWords = toUSDWords(normalizedTotal)
    values.amountInWords = amountWords || values.amountInWords
  }

  if (values.headerPhone && !String(values.headerPhone).toUpperCase().startsWith('PHONE:')) {
    values.headerPhone = `PHONE: ${values.headerPhone}`
  }
  values.headerWebsite = String(values.headerWebsite || '').trim().toUpperCase() || 'WWW.KSMAGNETIC.COM'
  values.title = String(values.title || 'PROFORMA INVOICE').trim().toUpperCase()
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

const PURCHASE_CONTRACT_FIELD_SCHEMA = [
  {
    key: 'buyerCompany',
    label: '买方公司',
    defaultValue: '杭州科森磁材有限公司',
    aliases: ['buyercompany', 'companyname', 'company_name', 'customername', 'name'],
  },
  {
    key: 'buyerAddress',
    label: '买方地址',
    defaultValue: '浙江省杭州市萧山区北干街道永久路288号万象汇B座912',
    aliases: ['buyeraddress', 'companyaddress', 'address', 'customeraddress'],
  },
  {
    key: 'buyerZip',
    label: '买方邮编',
    defaultValue: '邮编: 311202',
    aliases: ['buyerzip', 'zipcode', 'zip', 'post_code', 'postcode'],
  },
  {
    key: 'buyerPhone',
    label: '买方电话',
    defaultValue: '电话: 0571 8679 0529',
    aliases: ['buyerphone', 'companyphone', 'phone', 'tel', 'contactphone', 'contact_phone'],
  },
  {
    key: 'website',
    label: '网址',
    defaultValue: 'WWW.KSMAGNETIC.COM',
    aliases: ['website', 'web', 'url'],
  },
  {
    key: 'sellerName',
    label: '卖方',
    defaultValue: '宁波星升磁性材料有限公司',
    aliases: ['sellername', 'suppliername', 'vendorname', 'partnername'],
  },
  {
    key: 'sellerAddress',
    label: '卖方地址',
    defaultValue: '浙江省余姚市河姆渡镇万洋(河姆渡镇)众创城27幢102',
    aliases: ['selleraddress', 'supplieraddress', 'vendoraddress'],
  },
  {
    key: 'sellerPhone',
    label: '卖方电话',
    defaultValue: '电话：0574-87475218',
    aliases: ['sellerphone', 'supplierphone', 'vendorphone'],
  },
  {
    key: 'contractNo',
    label: '合同编号',
    defaultValue: 'KSMC20260104001',
    aliases: ['contractno', 'contract_no', 'code', 'purchasecode'],
  },
  {
    key: 'signDate',
    label: '签订日期',
    defaultValue: '2026年1月4日',
    aliases: ['signdate', 'sign_date', 'date', 'created_at'],
  },
  {
    key: 'priceTerm',
    label: '价格条件',
    defaultValue: '含13%增值税及运费',
    aliases: ['priceterm', 'price_term', 'trade_term', 'trade_terms'],
  },
  {
    key: 'settlement',
    label: '结算方式',
    defaultValue: '月结30天',
    aliases: ['settlement', 'settlementmethod', 'paymentmethod', 'payment_method'],
  },
  {
    key: 'itemNo',
    label: '序号',
    defaultValue: '1',
    aliases: ['itemno', 'item_no'],
  },
  {
    key: 'itemDescription',
    label: '产品描述',
    defaultValue:
      '如图，圆环沉孔磁钢，D9.525XD3.048X3.175-82°沉孔、深度约1mm，N42(不含管制元素钐、钆、镝、铽、镥、钪、钇)，镀镍铜镍，內圆公差+0.1/-0，厚度公差+0/-0.1，其余公差+/-0.1, 轴向充磁供货，沉孔面为N极。产品外观好，避免缺边掉角。',
    aliases: ['itemdescription', 'item_desc', 'productname', 'goodsdescription', 'description'],
  },
  {
    key: 'quantity',
    label: '数量',
    defaultValue: '100',
    aliases: ['quantity', 'qty', 'itemqty'],
  },
  {
    key: 'unitPrice',
    label: '单价',
    defaultValue: '¥1.000',
    aliases: ['unitprice', 'price', 'itemunitprice', 'netprice'],
  },
  {
    key: 'amount',
    label: '金额',
    defaultValue: '¥100.00',
    aliases: ['amount', 'itemamount', 'totalprice', 'total_price'],
  },
  {
    key: 'totalAmount',
    label: '总计',
    defaultValue: '¥100.00',
    aliases: ['totalamount', 'grandtotal', 'sumamount'],
  },
  {
    key: 'requiredDeliveryDate',
    label: '要求交货日期',
    defaultValue: '2026/03/05',
    aliases: ['requireddeliverydate', 'required_delivery_date', 'deliverydate', 'delivery_date'],
  },
  {
    key: 'sellerConfirmDeliveryDate',
    label: '卖方确认交货日期',
    defaultValue: '',
    aliases: ['sellerconfirmdeliverydate', 'confirm_delivery_date'],
  },
  {
    key: 'innerPackaging',
    label: '内包装',
    defaultValue: '八孔泡沫箱+真空包装',
    aliases: ['innerpackaging', 'inner_package', 'innerpack', 'packdetail'],
  },
  {
    key: 'outerPackaging',
    label: '外包装',
    defaultValue: '纸箱+防潮袋',
    aliases: ['outerpackaging', 'outer_package', 'outerpack'],
  },
  {
    key: 'shield',
    label: '是否屏蔽',
    defaultValue: '否',
    aliases: ['shield', 'isshielded', 'is_shielded'],
  },
  {
    key: 'deliveryAddress',
    label: '交货地点',
    defaultValue: '直接进仓',
    aliases: ['deliveryaddress', 'delivery_address', 'deliveryplace'],
  },
  {
    key: 'shippingDocs',
    label: '随货单据',
    defaultValue:
      '1.( √ )送货单 2.(  )检测报告(尺寸,磁通,退磁曲线) 3.( )毛坯测试样柱D10X10  4.( )盐雾试验报告 5.( )镀层厚度报告  6.( )材质成分报告',
    aliases: ['shippingdocs', 'shipping_docs', 'docs', 'documents'],
  },
  {
    key: 'otherRequirement',
    label: '其他要求',
    defaultValue: '',
    aliases: ['otherrequirement', 'other_requirement', 'remark'],
  },
]

const PURCHASE_CONTRACT_PANEL_FIELD_SCHEMA = [
  { key: 'buyerCompany', label: '买方公司' },
  { key: 'buyerAddress', label: '买方地址' },
  { key: 'buyerZip', label: '买方邮编' },
  { key: 'buyerPhone', label: '买方电话' },
  { key: 'website', label: '网址' },
  { key: 'sellerName', label: '卖方' },
  { key: 'sellerAddress', label: '卖方地址' },
  { key: 'sellerPhone', label: '卖方电话' },
  { key: 'contractNo', label: '合同编号' },
  { key: 'signDate', label: '签订日期' },
  { key: 'priceTerm', label: '价格条件' },
  { key: 'settlement', label: '结算方式' },
  { key: 'itemDescription', label: '产品描述' },
  { key: 'quantity', label: '数量(个)' },
  { key: 'unitPrice', label: '单价' },
  { key: 'amount', label: '金额' },
  { key: 'totalAmount', label: '总计' },
  { key: 'requiredDeliveryDate', label: '要求交货日期' },
  { key: 'sellerConfirmDeliveryDate', label: '卖方确认交货日期' },
  { key: 'innerPackaging', label: '内包装' },
  { key: 'outerPackaging', label: '外包装' },
  { key: 'shield', label: '是否屏蔽' },
  { key: 'deliveryAddress', label: '交货地点' },
  { key: 'shippingDocs', label: '随货单据' },
  { key: 'otherRequirement', label: '其他要求' },
]

const PURCHASE_CONTRACT_CANVAS_WIDTH = 595.32
const PURCHASE_CONTRACT_CANVAS_HEIGHT = 841.92

const PURCHASE_CONTRACT_IMAGE_LAYOUT = {
  logo: {
    left: 395.26,
    top: 30.42,
    width: 117.82,
    height: 19.62,
  },
  stamp: {
    left: 119.95,
    top: 542.23,
    width: 110.45,
    height: 115.5,
  },
  spec: {
    left: 95.4,
    top: 694.56,
    width: 294.87,
    height: 116.17,
  },
}

const PURCHASE_CONTRACT_GRID_LINE_LAYOUT = [
  { left: 95.66, top: 157.1, width: 0.6, height: 74.76 },
  { left: 361.99, top: 157.1, width: 0.6, height: 74.76 },
  { left: 69.26, top: 155.79, width: 1.32, height: 252.26 },
  { left: 95.66, top: 249.39, width: 0.6, height: 52.82 },
  { left: 361.99, top: 249.39, width: 0.6, height: 110.42 },
  { left: 416.11, top: 157.1, width: 0.6, height: 92.28 },
  { left: 470.26, top: 157.1, width: 0.6, height: 92.28 },
  { left: 524.02, top: 157.11, width: 1.32, height: 250.94 },
  { left: 139.34, top: 249.39, width: 0.6, height: 157.34 },
  { left: 288.77, top: 249.39, width: 0.6, height: 110.42 },
  { left: 70.58, top: 155.78, width: 454.75, height: 1.32 },
  { left: 70.58, top: 179.9, width: 453.43, height: 0.6 },
  { left: 70.58, top: 231.26, width: 453.43, height: 0.6 },
  { left: 70.58, top: 248.78, width: 453.43, height: 0.6 },
  { left: 70.58, top: 301.61, width: 453.43, height: 0.6 },
  { left: 70.58, top: 318.29, width: 453.43, height: 0.6 },
  { left: 70.58, top: 335.45, width: 453.43, height: 0.6 },
  { left: 70.58, top: 359.21, width: 453.43, height: 0.6 },
  { left: 70.58, top: 384.41, width: 453.43, height: 0.6 },
  { left: 70.58, top: 406.73, width: 454.75, height: 1.32 },
]

const PURCHASE_CONTRACT_STATIC_TEXT_LAYOUT = [
  { text: '采购合同', left: 0, top: 75.2, width: PURCHASE_CONTRACT_CANVAS_WIDTH, className: 'purchase-title purchase-center' },
  { text: '卖方:', left: 71.54, top: 94.86, width: 25, className: 'purchase-no-wrap' },
  { text: '合同编号', left: 363.91, top: 107.46, width: 36, className: 'purchase-no-wrap' },
  { text: '签订日期', left: 363.91, top: 119.34, width: 36, className: 'purchase-no-wrap' },
  { text: '价格条件', left: 363.91, top: 129.9, width: 36, className: 'purchase-no-wrap' },
  { text: '结算方式', left: 363.91, top: 140.46, width: 36, className: 'purchase-no-wrap' },
  { text: '序号', left: 74.9, top: 164.94, width: 16, className: 'purchase-no-wrap' },
  { text: '产品描述', left: 213.05, top: 164.46, width: 35, className: 'purchase-no-wrap' },
  { text: '数量(个)', left: 374.71, top: 164.7, width: 27, className: 'purchase-no-wrap' },
  { text: '单价', left: 435.43, top: 164.94, width: 20, className: 'purchase-no-wrap' },
  { text: '金额', left: 489.58, top: 164.94, width: 20, className: 'purchase-no-wrap' },
  { text: '总计', left: 435.43, top: 236.46, width: 20, className: 'purchase-no-wrap' },
  { text: '唛头\n格式', left: 71.54, top: 266.49, width: 24, className: 'purchase-center purchase-multiline' },
  { text: '内箱(小白盒)', left: 97.58, top: 266.25, width: 44, className: 'purchase-no-wrap' },
  { text: 'SIZE: D9.525XD3.048X3.175', left: 141.26, top: 251.33, width: 145, className: 'purchase-arial purchase-no-wrap' },
  { text: 'GRADE: N42', left: 141.26, top: 264.56, width: 80, className: 'purchase-arial purchase-no-wrap' },
  { text: 'COATING: NICUNI', left: 141.26, top: 277.76, width: 100, className: 'purchase-arial purchase-no-wrap' },
  { text: "Q'TY:", left: 141.26, top: 290.96, width: 40, className: 'purchase-arial purchase-no-wrap' },
  { text: '纸箱(外箱)', left: 290.69, top: 271.41, width: 37, className: 'purchase-no-wrap' },
  { text: '由我司提供', left: 363.79, top: 271.65, width: 40, className: 'purchase-no-wrap' },
  { text: '要求交货日期', left: 71.54, top: 306.45, width: 48, className: 'purchase-no-wrap' },
  { text: '卖方确认交货日期', left: 290.69, top: 306.45, width: 65, className: 'purchase-no-wrap' },
  { text: '内包装', left: 71.54, top: 323.37, width: 24, className: 'purchase-no-wrap' },
  { text: '外包装', left: 290.69, top: 323.37, width: 24, className: 'purchase-no-wrap' },
  { text: '是否屏蔽', left: 71.54, top: 343.77, width: 32, className: 'purchase-no-wrap' },
  { text: '交货地点', left: 290.69, top: 343.77, width: 32, className: 'purchase-no-wrap' },
  { text: '随货单据', left: 71.54, top: 368.25, width: 32, className: 'purchase-no-wrap' },
  { text: '其他要求', left: 71.54, top: 392.25, width: 32, className: 'purchase-no-wrap' },
  { text: '其他条款:', left: 71.54, top: 411.93, width: 34, className: 'purchase-no-wrap' },
  {
    text: '1. 双方本着平等, 自愿, 公平, 互惠互利和诚实守信的原则, 就零部件采购有关事宜协商一致订立本合同,以便共同遵守。',
    left: 71.54,
    top: 422.96,
    width: 450.03,
    className: 'purchase-multiline',
  },
  {
    text: '2. 包装要求: 防潮防碎,唛头清晰,适合长途运输,保证产品在运输过程中不受损。由于包装不当导致运输过程中货物的损坏，相应损失由乙方承担。',
    left: 71.54,
    top: 436.42,
    width: 450.03,
    className: 'purchase-multiline',
  },
  {
    text: '3.如乙方未能按照合同双方确定的期限交货，每延迟交付一日，应向甲方支付合同金额的1%作为违约金，若超过15天，甲方有权取消本合同，乙方需承担不低于合同金额20%的违约金。',
    left: 71.54,
    top: 467.5,
    width: 450.03,
    className: 'purchase-multiline',
  },
  {
    text: '4.若乙方交货的质量不符合合同的约定,则应向甲方赔偿因质量不符给甲方带来损失,包括但不限于预期利润损失、停工损失、对第三方的违约赔偿责任等等。',
    left: 71.54,
    top: 489.22,
    width: 450.03,
    className: 'purchase-multiline',
  },
  {
    text: '5. 解决合同纠纷的方式：本合同若发生纠纷，双方应及时协商解决，协商不成时，按《民法典》执行。',
    left: 71.54,
    top: 511.54,
    width: 450.03,
    className: 'purchase-multiline',
  },
  { text: '6. 本合同自双方签字之日起生效。', left: 71.54, top: 521.5, width: 260, className: 'purchase-no-wrap' },
  { text: '买方签章:', left: 71.54, top: 596.99, width: 40, className: 'purchase-no-wrap' },
  { text: '卖方签章:', left: 363.91, top: 596.99, width: 40, className: 'purchase-no-wrap' },
  { text: '.375 in', left: 76.97, top: 741.56, width: 28, className: 'purchase-calibri purchase-no-wrap' },
  {
    text: '第 1 页，共 2 页',
    left: 261.05,
    top: 808.51,
    width: 72.32,
    className: 'purchase-center purchase-no-wrap',
  },
]

const PURCHASE_CONTRACT_EDITABLE_TEXT_LAYOUT = [
  {
    fieldKey: 'buyerCompany',
    left: 72.02,
    top: 28.92,
    width: 240,
    className: 'purchase-company purchase-no-wrap',
  },
  {
    fieldKey: 'buyerAddress',
    left: 71.3,
    top: 44.01,
    width: 260,
    className: 'purchase-small purchase-multiline',
    multiline: true,
  },
  {
    fieldKey: 'buyerZip',
    left: 71.3,
    top: 52.65,
    width: 120,
    className: 'purchase-small purchase-no-wrap',
  },
  {
    fieldKey: 'buyerPhone',
    left: 71.3,
    top: 61.29,
    width: 150,
    className: 'purchase-small purchase-no-wrap',
  },
  {
    fieldKey: 'website',
    left: 389.35,
    top: 60.63,
    width: 134,
    className: 'purchase-small purchase-arial purchase-no-wrap',
  },
  {
    fieldKey: 'sellerName',
    left: 71.9,
    top: 105.14,
    width: 250,
    className: 'purchase-seller-name purchase-no-wrap',
  },
  {
    fieldKey: 'sellerAddress',
    left: 71.54,
    top: 118.62,
    width: 286,
    className: 'purchase-multiline',
    multiline: true,
  },
  {
    fieldKey: 'sellerPhone',
    left: 71.54,
    top: 129.18,
    width: 180,
    className: 'purchase-no-wrap',
  },
  {
    fieldKey: 'contractNo',
    left: 418.03,
    top: 106.49,
    width: 105,
    className: 'purchase-no-wrap',
  },
  {
    fieldKey: 'signDate',
    left: 418.03,
    top: 117.89,
    width: 105,
    className: 'purchase-no-wrap',
  },
  {
    fieldKey: 'priceTerm',
    left: 418.03,
    top: 129.66,
    width: 105,
    className: 'purchase-no-wrap',
  },
  {
    fieldKey: 'settlement',
    left: 418.03,
    top: 139.74,
    width: 105,
    className: 'purchase-no-wrap',
  },
  {
    fieldKey: 'itemNo',
    left: 72.02,
    top: 201.53,
    width: 22,
    className: 'purchase-center purchase-no-wrap purchase-arial',
  },
  {
    fieldKey: 'itemDescription',
    left: 140.42,
    top: 185.22,
    width: 219,
    className: 'purchase-multiline',
    multiline: true,
  },
  {
    fieldKey: 'quantity',
    left: 374.71,
    top: 201.53,
    width: 27,
    className: 'purchase-center purchase-no-wrap purchase-arial',
  },
  {
    fieldKey: 'unitPrice',
    left: 425.95,
    top: 201.53,
    width: 34,
    className: 'purchase-center purchase-no-wrap purchase-arial',
  },
  {
    fieldKey: 'amount',
    left: 478.5,
    top: 201.53,
    width: 40,
    className: 'purchase-center purchase-no-wrap purchase-arial',
  },
  {
    fieldKey: 'totalAmount',
    left: 478.5,
    top: 235.61,
    width: 40,
    className: 'purchase-center purchase-no-wrap purchase-arial purchase-bold',
  },
  {
    fieldKey: 'requiredDeliveryDate',
    left: 141.26,
    top: 305.96,
    width: 80,
    className: 'purchase-arial purchase-no-wrap',
  },
  {
    fieldKey: 'sellerConfirmDeliveryDate',
    left: 363.79,
    top: 305.96,
    width: 150,
    className: 'purchase-arial purchase-no-wrap',
  },
  {
    fieldKey: 'innerPackaging',
    left: 141.14,
    top: 323.85,
    width: 145,
    className: 'purchase-no-wrap',
  },
  {
    fieldKey: 'outerPackaging',
    left: 363.91,
    top: 323.01,
    width: 145,
    className: 'purchase-no-wrap',
  },
  {
    fieldKey: 'shield',
    left: 141.14,
    top: 344.25,
    width: 80,
    className: 'purchase-no-wrap',
  },
  {
    fieldKey: 'deliveryAddress',
    left: 363.79,
    top: 343.77,
    width: 145,
    className: 'purchase-no-wrap',
  },
  {
    fieldKey: 'shippingDocs',
    left: 141.26,
    top: 362.48,
    width: 382,
    className: 'purchase-multiline',
    multiline: true,
  },
  {
    fieldKey: 'otherRequirement',
    left: 141.26,
    top: 392.25,
    width: 382,
    className: 'purchase-no-wrap',
  },
]

const buildPurchaseInlineStyle = ({ left, top, width, height }) => {
  const styleParts = [`left:${left}px`, `top:${top}px`]
  if (width != null) {
    styleParts.push(`width:${width}px`)
  }
  if (height != null) {
    styleParts.push(`height:${height}px`)
  }
  return styleParts.join(';')
}

const formatPurchaseNodeText = (text = '') => escapeHTML(String(text || '')).replaceAll('\n', '<br />')

const getChinaDateParts = (dateValue) => {
  if (!(dateValue instanceof Date) || Number.isNaN(dateValue.getTime())) {
    return null
  }
  const chinaMillis = dateValue.getTime() + 8 * 60 * 60 * 1000
  const chinaDate = new Date(chinaMillis)
  return {
    year: chinaDate.getUTCFullYear(),
    month: chinaDate.getUTCMonth() + 1,
    day: chinaDate.getUTCDate(),
  }
}

const parsePurchaseDateParts = (raw) => {
  const text = String(raw || '').trim()
  if (!text) {
    return null
  }

  if (/^\d{10,13}$/.test(text)) {
    const ts = Number(text)
    if (!Number.isNaN(ts)) {
      const millis = text.length === 10 ? ts * 1000 : ts
      return getChinaDateParts(new Date(millis))
    }
  }

  const basicDateMatch = text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/)
  if (basicDateMatch) {
    return {
      year: Number(basicDateMatch[1]),
      month: Number(basicDateMatch[2]),
      day: Number(basicDateMatch[3]),
    }
  }

  const parsedDate = new Date(text)
  if (!Number.isNaN(parsedDate.getTime())) {
    return getChinaDateParts(parsedDate)
  }
  return null
}

const normalizePurchaseDateValue = (raw, mode = 'cn') => {
  const text = String(raw || '').trim()
  if (!text) {
    return ''
  }
  const dateParts = parsePurchaseDateParts(text)
  if (!dateParts) {
    return text
  }
  if (mode === 'slash') {
    return `${dateParts.year}/${String(dateParts.month).padStart(2, '0')}/${String(dateParts.day).padStart(2, '0')}`
  }
  return `${dateParts.year}年${dateParts.month}月${dateParts.day}日`
}

const formatPurchaseCurrencyValue = (raw, fractionDigits = 2) => {
  const numeric = parseNumericValue(raw)
  if (Number.isNaN(numeric)) {
    return String(raw || '').trim()
  }
  return `¥${numeric.toFixed(fractionDigits)}`
}

const formatPurchaseQuantityValue = (raw) => {
  const numeric = parseNumericValue(raw)
  if (Number.isNaN(numeric)) {
    return String(raw || '').trim()
  }
  if (Number.isInteger(numeric)) {
    return String(numeric)
  }
  return String(Number(numeric.toFixed(4)))
}

const buildPurchaseContractFields = (record = {}) => {
  const { values, hasExplicit, flattenedMap } = buildFieldsBySchema(record, PURCHASE_CONTRACT_FIELD_SCHEMA)
  const recordItems = Array.isArray(record?.items) ? record.items : []
  const firstItem = recordItems[0] || {}

  if (!hasExplicit.sellerName) {
    values.sellerName = flattenedMap.suppliername || flattenedMap.partnername || flattenedMap.name || values.sellerName
  }
  if (!hasExplicit.sellerAddress) {
    values.sellerAddress =
      flattenedMap.supplieraddress || flattenedMap.partneraddress || flattenedMap.address || values.sellerAddress
  }
  if (!hasExplicit.sellerPhone) {
    const phoneText =
      flattenedMap.supplierphone || flattenedMap.contactphone || flattenedMap.phone || flattenedMap.tel || ''
    if (phoneText) {
      values.sellerPhone = phoneText.startsWith('电话') ? phoneText : `电话：${phoneText}`
    }
  }
  if (!hasExplicit.contractNo) {
    values.contractNo = flattenedMap.code || flattenedMap.purchasecode || values.contractNo
  }
  if (!hasExplicit.signDate) {
    values.signDate = flattenedMap.signdate || flattenedMap.sign_date || flattenedMap.created_at || values.signDate
  }
  if (!hasExplicit.priceTerm) {
    values.priceTerm = flattenedMap.priceterm || flattenedMap.price_term || values.priceTerm
  }
  if (!hasExplicit.settlement) {
    values.settlement = flattenedMap.settlement || flattenedMap.paymentmethod || values.settlement
  }

  if (!hasExplicit.itemDescription) {
    const itemDescription =
      firstItem.productName ||
      firstItem.cnDesc ||
      firstItem.enDesc ||
      firstItem.productModel ||
      firstItem.description ||
      values.itemDescription
    const spec = String(firstItem.specCode || '').trim()
    values.itemDescription = spec && !String(itemDescription).includes(spec) ? `${itemDescription}，${spec}` : itemDescription
  }
  if (!hasExplicit.quantity) {
    values.quantity =
      firstItem.quantity != null && firstItem.quantity !== '' ? String(firstItem.quantity) : values.quantity
  }
  if (!hasExplicit.unitPrice) {
    const unitPriceRaw = firstItem.unitPrice ?? firstItem.price
    if (unitPriceRaw != null && unitPriceRaw !== '') {
      values.unitPrice = String(unitPriceRaw)
    }
  }
  if (!hasExplicit.amount) {
    const explicitAmount = firstItem.totalPrice ?? firstItem.totalAmount ?? firstItem.amount
    if (explicitAmount != null && explicitAmount !== '') {
      values.amount = String(explicitAmount)
    } else {
      const quantityValue = parseNumericValue(values.quantity)
      const unitPriceValue = parseNumericValue(values.unitPrice)
      if (!Number.isNaN(quantityValue) && !Number.isNaN(unitPriceValue)) {
        values.amount = String(quantityValue * unitPriceValue)
      }
    }
  }
  if (!hasExplicit.totalAmount) {
    const explicitTotal = flattenedMap.totalamount || flattenedMap.total_price || flattenedMap.totalprice || ''
    if (explicitTotal) {
      values.totalAmount = explicitTotal
    } else {
      values.totalAmount = values.amount
    }
  }
  if (!hasExplicit.requiredDeliveryDate) {
    values.requiredDeliveryDate =
      flattenedMap.deliverydate || flattenedMap.delivery_date || flattenedMap.requireddeliverydate || values.requiredDeliveryDate
  }
  if (!hasExplicit.sellerConfirmDeliveryDate) {
    values.sellerConfirmDeliveryDate =
      flattenedMap.sellerconfirmdeliverydate || flattenedMap.confirm_delivery_date || values.sellerConfirmDeliveryDate
  }
  if (!hasExplicit.innerPackaging) {
    values.innerPackaging =
      flattenedMap.innerpackaging || flattenedMap.inner_package || firstItem.packDetail || values.innerPackaging
  }
  if (!hasExplicit.outerPackaging) {
    values.outerPackaging = flattenedMap.outerpackaging || flattenedMap.outer_package || values.outerPackaging
  }
  if (!hasExplicit.shield) {
    values.shield = flattenedMap.shield || flattenedMap.isshielded || values.shield
  }
  if (!hasExplicit.deliveryAddress) {
    values.deliveryAddress =
      flattenedMap.deliveryaddress || flattenedMap.delivery_address || flattenedMap.deliveryplace || values.deliveryAddress
  }
  if (!hasExplicit.shippingDocs) {
    values.shippingDocs = flattenedMap.shippingdocs || flattenedMap.documents || values.shippingDocs
  }
  if (!hasExplicit.otherRequirement) {
    values.otherRequirement = flattenedMap.otherrequirement || flattenedMap.remark || values.otherRequirement
  }

  values.website = String(values.website || 'WWW.KSMAGNETIC.COM').trim().toUpperCase()
  values.signDate = normalizePurchaseDateValue(values.signDate, 'cn')
  values.requiredDeliveryDate = normalizePurchaseDateValue(values.requiredDeliveryDate, 'slash')
  values.sellerConfirmDeliveryDate = normalizePurchaseDateValue(values.sellerConfirmDeliveryDate, 'slash')
  values.quantity = formatPurchaseQuantityValue(values.quantity)
  values.unitPrice = formatPurchaseCurrencyValue(values.unitPrice, 3)
  values.amount = formatPurchaseCurrencyValue(values.amount, 2)
  values.totalAmount = formatPurchaseCurrencyValue(values.totalAmount, 2)
  return values
}

const buildPurchaseStaticNodeHTML = (node) => {
  const className = ['purchase-text', 'purchase-editable', node.className].filter(Boolean).join(' ')
  return `<div class="${className}" style="${buildPurchaseInlineStyle(node)}" contenteditable="true" spellcheck="false">${formatPurchaseNodeText(node.text)}</div>`
}

const buildPurchaseEditableNodeHTML = (fields, node) => {
  const value = String(fields[node.fieldKey] || '')
  const className = ['purchase-text', 'purchase-editable', node.className].filter(Boolean).join(' ')
  const multilineAttr = node.multiline ? ' data-multiline="true"' : ''
  return `<div class="${className}" style="${buildPurchaseInlineStyle(node)}" data-billing-field="${escapeHTML(node.fieldKey)}" data-default="${escapeHTML(value)}" contenteditable="true" spellcheck="false"${multilineAttr}>${formatPurchaseNodeText(value)}</div>`
}

const buildPurchaseGridLineHTML = (line, index) =>
  `<div class="purchase-grid-line" data-grid-line="${index}" style="${buildPurchaseInlineStyle(line)}"></div>`

const buildPurchaseContractTemplateHTML = (record = {}) => {
  const fields = buildPurchaseContractFields(record)
  const staticNodesHTML = PURCHASE_CONTRACT_STATIC_TEXT_LAYOUT.map(buildPurchaseStaticNodeHTML).join('')
  const editableNodesHTML = PURCHASE_CONTRACT_EDITABLE_TEXT_LAYOUT.map((node) =>
    buildPurchaseEditableNodeHTML(fields, node)
  ).join('')
  const gridLinesHTML = PURCHASE_CONTRACT_GRID_LINE_LAYOUT.map(buildPurchaseGridLineHTML).join('')

  return `
    <section class="purchase-contract-template">
      <article class="purchase-contract-paper">
        <div class="purchase-contract-canvas" role="img" aria-label="采购合同模板">
          <div class="purchase-contract-grid">${gridLinesHTML}</div>
          <div class="purchase-red-mark" style="left:111.64px;top:736.86px;width:28px;"></div>
          ${staticNodesHTML}
          ${editableNodesHTML}
          <img class="purchase-contract-logo" src="/templates/purchase-contract-logo.png" alt="KS MAGNETICS" draggable="false" />
          <img class="purchase-contract-stamp" src="/templates/purchase-contract-stamp.png" alt="合同专用章" draggable="false" />
          <img class="purchase-contract-spec" src="/templates/purchase-contract-spec.png" alt="产品尺寸示意图" draggable="false" />
        </div>
      </article>
    </section>
  `
}

const matchMagic = (arrayBuffer, expectedMagic) => {
  if (!(arrayBuffer instanceof ArrayBuffer) || arrayBuffer.byteLength < expectedMagic.length) {
    return false
  }
  const bytes = new Uint8Array(arrayBuffer, 0, expectedMagic.length)
  return expectedMagic.every((value, index) => bytes[index] === value)
}

const isExcelArrayBuffer = (arrayBuffer) =>
  matchMagic(arrayBuffer, EXCEL_XLS_MAGIC) || matchMagic(arrayBuffer, EXCEL_XLSX_MAGIC)

const isPDFArrayBuffer = (arrayBuffer) => matchMagic(arrayBuffer, PDF_MAGIC)

const arrayBufferToText = (arrayBuffer) => {
  try {
    return new TextDecoder('utf-8').decode(new Uint8Array(arrayBuffer))
  } catch (err) {
    return ''
  }
}

const looksLikeHTML = (text) => {
  if (!text) {
    return false
  }
  const start = text.trimStart().slice(0, 256).toLowerCase()
  return start.startsWith('<!doctype html') || start.startsWith('<html') || start.includes('<table')
}

const looksLikeAppShellHTML = (text) => {
  const html = text.toLowerCase()
  return (
    html.includes('id="root"') ||
    html.includes("id='root'") ||
    html.includes('<script type="module"') ||
    html.includes('vite') ||
    html.includes('react')
  )
}

const stripHTMLDocument = (html) => {
  const withoutScripts = html.replace(/<script[\s\S]*?<\/script>/gi, '')
  const bodyMatch = withoutScripts.match(/<body[^>]*>([\s\S]*)<\/body>/i)
  return bodyMatch ? bodyMatch[1] : withoutScripts
}

const withEditableCells = (rawHTML) => {
  const markEditable = (html, tag) =>
    html.replace(
      new RegExp(`<${tag}(?![^>]*contenteditable)`, 'gi'),
      `<${tag} contenteditable="true" spellcheck="false"`
    )
  return markEditable(markEditable(rawHTML, 'td'), 'th')
}

const buildEditableSheetHTML = (arrayBuffer) => {
  try {
    const workbook = XLSX.read(arrayBuffer, {
      type: 'array',
      cellStyles: true,
      cellDates: true,
      cellNF: true,
    })
    const firstSheetName = workbook.SheetNames?.[0]
    if (!firstSheetName) {
      throw new Error('模板文件没有可用工作表')
    }

    const worksheet = workbook.Sheets[firstSheetName]
    const sheetHTML = XLSX.utils.sheet_to_html(worksheet, {
      id: 'erp-template-sheet',
    })
    return withEditableCells(sheetHTML)
  } catch (err) {
    const message = String(err?.message || '')
    if (message.includes('could not find <table>')) {
      throw new Error('模板内容不是有效的 Excel 工作表，请上传原始 xls/xlsx 模板文件')
    }
    throw err
  }
}

const buildTemplateHTMLFromResponse = (templateKey, arrayBuffer, contentType = '', record = {}) => {
  const fixedTemplateHTML = getFixedTemplateHTML(templateKey, record)
  if (fixedTemplateHTML) {
    return fixedTemplateHTML
  }

  if (isExcelArrayBuffer(arrayBuffer)) {
    return buildEditableSheetHTML(arrayBuffer)
  }

  const asText = arrayBufferToText(arrayBuffer)
  if (looksLikeHTML(asText) || contentType.includes('text/html')) {
    if (looksLikeAppShellHTML(asText)) {
      throw new Error('返回了应用壳 HTML，未获取到真实模板文件')
    }
    return withEditableCells(stripHTMLDocument(asText))
  }

  if (isPDFArrayBuffer(arrayBuffer)) {
    throw new Error('当前模板是 PDF，无法直接编辑；请上传 xls/xlsx 模板')
  }

  throw new Error('模板文件格式不支持，请使用 xls/xlsx/html')
}

const fetchBinaryWithMeta = async (url, options = {}) => {
  const resp = await fetch(url, options)
  const arrayBuffer = await resp.arrayBuffer()
  return {
    ok: resp.ok,
    status: resp.status,
    arrayBuffer,
    contentType: String(resp.headers.get('content-type') || '').toLowerCase(),
  }
}

const fetchTemplateHTML = async (templateKey, record = {}) => {
  const fixedTemplateHTML = getFixedTemplateHTML(templateKey, record)
  if (fixedTemplateHTML) {
    return { source: 'default', templateHTML: fixedTemplateHTML }
  }

  const authToken = getToken(AUTH_SCOPE.ADMIN)
  const serverHeaders = authToken ? { Authorization: `Bearer ${authToken}` } : {}

  try {
    const serverResp = await fetchBinaryWithMeta(`/templates/file/${templateKey}`, {
      headers: serverHeaders,
    })
    if (serverResp.ok) {
      const serverHTML = buildTemplateHTMLFromResponse(
        templateKey,
        serverResp.arrayBuffer,
        serverResp.contentType,
        record
      )
      return { source: 'server', templateHTML: serverHTML }
    }
  } catch (err) {
    // 服务端不可达或内容非法时自动回退默认模板。
  }

  const fallbackAsset = DEFAULT_TEMPLATE_ASSET_MAP[templateKey] || DEFAULT_TEMPLATE_ASSET_MAP.invoice
  const fallbackResp = await fetchBinaryWithMeta(fallbackAsset)
  if (!fallbackResp.ok) {
    throw new Error(`模板加载失败：${templateKey}`)
  }
  const fallbackHTML = buildTemplateHTMLFromResponse(
    templateKey,
    fallbackResp.arrayBuffer,
    fallbackResp.contentType,
    record
  )
  return { source: 'default', templateHTML: fallbackHTML }
}

const DEFAULT_BILLING_INFO_TEMPLATE_HTML = `
  <section class="billing-info-template">
    <article class="billing-info-paper">
      <div class="billing-info-canvas" role="img" aria-label="杭州科森磁材开票信息模板">
        <img class="billing-logo" src="/templates/billing-info-logo.png" alt="KS MAGNETICS" draggable="false" />
        <img class="billing-stamp" src="/templates/billing-info-stamp.png" alt="公章水印" draggable="false" />
        <div class="billing-divider"></div>

        <div class="billing-text billing-editable billing-header-company-en" data-billing-field="headerCompanyEn" data-default="HANGZHOU KESEN MAGNETICS CO., LTD." contenteditable="true" spellcheck="false">HANGZHOU KESEN MAGNETICS CO., LTD.</div>
        <div class="billing-text billing-editable billing-header-address-1" data-billing-field="headerAddressLine1" data-default="288 YONGJIU ROAD,HANGZHOU" contenteditable="true" spellcheck="false">288 YONGJIU ROAD,HANGZHOU</div>
        <div class="billing-text billing-editable billing-header-address-2" data-billing-field="headerAddressLine2" data-default="ZHEJIANG 311202" contenteditable="true" spellcheck="false">ZHEJIANG 311202</div>
        <div class="billing-text billing-editable billing-header-country" data-billing-field="headerCountry" data-default="CHINA" contenteditable="true" spellcheck="false">CHINA</div>
        <div class="billing-text billing-editable billing-header-phone" data-billing-field="headerPhone" data-default="PHONE: +86 571 8679 0529" contenteditable="true" spellcheck="false">PHONE: +86 571 8679 0529</div>
        <div class="billing-text billing-editable billing-header-website" data-billing-field="headerWebsite" data-default="WWW.KSMAGNETIC.COM" contenteditable="true" spellcheck="false">WWW.KSMAGNETIC.COM</div>

        <div class="billing-text billing-editable billing-title-company-cn" data-billing-field="titleCompanyCn" data-default="杭州科森磁材有限公司" contenteditable="true" spellcheck="false">杭州科森磁材有限公司</div>
        <div class="billing-text billing-editable billing-title-doc" data-billing-field="titleDoc" data-default="开票资料" contenteditable="true" spellcheck="false">开票资料</div>

        <div class="billing-text billing-editable billing-label-company-name" data-billing-field="labelCompanyName" data-default="单位名称：" contenteditable="true" spellcheck="false">单位名称：</div>
        <div class="billing-text billing-editable billing-value-company-name" data-billing-field="companyName" data-default="杭州科森磁材有限公司" contenteditable="true" spellcheck="false">杭州科森磁材有限公司</div>

        <div class="billing-text billing-editable billing-label-tax-no" data-billing-field="labelTaxNo" data-default="纳税人识别号：" contenteditable="true" spellcheck="false">纳税人识别号：</div>
        <div class="billing-text billing-editable billing-value-tax-no" data-billing-field="taxNo" data-default="91330109MA7N1W9P5Y" contenteditable="true" spellcheck="false">91330109MA7N1W9P5Y</div>

        <div class="billing-text billing-editable billing-label-address" data-billing-field="labelAddress" data-default="地址：" contenteditable="true" spellcheck="false">地址：</div>
        <div class="billing-text billing-editable billing-value-address" data-billing-field="address" data-default="浙江省杭州市萧山区北干街道永久路288号912室" contenteditable="true" spellcheck="false">浙江省杭州市萧山区北干街道永久路288号912室</div>

        <div class="billing-text billing-editable billing-label-phone" data-billing-field="labelPhone" data-default="电话：" contenteditable="true" spellcheck="false">电话：</div>
        <div class="billing-text billing-editable billing-value-phone" data-billing-field="phone" data-default="0571-86790529" contenteditable="true" spellcheck="false">0571-86790529</div>

        <div class="billing-text billing-editable billing-label-bank-name" data-billing-field="labelBankName" data-default="开户行：" contenteditable="true" spellcheck="false">开户行：</div>
        <div class="billing-text billing-editable billing-value-bank-name" data-billing-field="bankName" data-default="中国农业银行杭州金城路支行" contenteditable="true" spellcheck="false">中国农业银行杭州金城路支行</div>

        <div class="billing-text billing-editable billing-label-bank-account" data-billing-field="labelBankAccount" data-default="账号：" contenteditable="true" spellcheck="false">账号：</div>
        <div class="billing-text billing-editable billing-value-bank-account" data-billing-field="bankAccount" data-default="19085201040039051" contenteditable="true" spellcheck="false">19085201040039051</div>

        <div class="billing-text billing-editable billing-footer-company" data-billing-field="footerCompanyName" data-default="杭州科森磁材有限公司" contenteditable="true" spellcheck="false">杭州科森磁材有限公司</div>
        <div class="billing-text billing-editable billing-footer-date" data-billing-field="date" data-default="2022年5月8日" contenteditable="true" spellcheck="false">2022年5月8日</div>
      </div>
    </article>
  </section>
`

const buildProformaInvoiceTemplateHTML = (record = {}) => {
  const fields = buildProformaInvoiceFields(record)
  const buildEditableNode = (fieldKey, className = '', multiline = false) => {
    const value = String(fields[fieldKey] || '')
    return `
      <div class="proforma-editable ${className}" data-billing-field="${escapeHTML(fieldKey)}" data-default="${escapeHTML(value)}" contenteditable="true" spellcheck="false"${multiline ? ' data-multiline="true"' : ''}>${escapeHTML(value)}</div>
    `
  }

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
              <img class="proforma-logo" src="/templates/billing-info-logo.png" alt="KS MAGNETICS" draggable="false" />
              ${buildEditableNode('headerWebsite', 'proforma-header-website')}
            </div>
          </header>

          <div class="proforma-divider"></div>
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
              ${buildEditableNode('sellerCompanyEn', 'proforma-seller-company-en')}
              ${buildEditableNode('sellerCompanyCn', 'proforma-seller-company-cn')}
              ${buildEditableNode('sellerSigner', 'proforma-seller-signer')}
              <div class="proforma-seller-sign-line"></div>
              <div class="proforma-seller-sign-note">Authorized Signature(s)</div>
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

const getFixedTemplateHTML = (templateKey, record = {}) => {
  if (!FIXED_LAYOUT_TEMPLATE_KEYS.has(templateKey)) {
    return ''
  }
  if (templateKey === 'billingInfo') {
    return DEFAULT_BILLING_INFO_TEMPLATE_HTML
  }
  if (templateKey === 'pi') {
    return buildProformaInvoiceTemplateHTML(record)
  }
  if (templateKey === 'purchase') {
    return buildPurchaseContractTemplateHTML(record)
  }
  return ''
}

const buildRecordPanelHTML = (record, templateKey) => {
  const isBillingInfo = templateKey === 'billingInfo'
  const isProformaInvoice = templateKey === 'pi'
  const isPurchaseContract = templateKey === 'purchase'
  const isFieldSyncTemplate = isBillingInfo || isProformaInvoice || isPurchaseContract
  const fields = isBillingInfo
    ? buildBillingInfoFields(record)
    : isProformaInvoice
      ? buildProformaInvoiceFields(record)
      : isPurchaseContract
        ? buildPurchaseContractFields(record)
        : flattenRecord(record)
  const panelTip = isBillingInfo
    ? '提示：左右两侧字段双向同步，右侧文本均可编辑（logo/水印除外），打印时仅输出右侧模板。'
    : isProformaInvoice
      ? '提示：左侧字段与右侧 PI 固定版式双向同步，右侧表格单元格可直接编辑，打印时仅输出右侧模板。'
      : isPurchaseContract
        ? '提示：左侧字段与右侧采购合同固定版式双向同步，模板按原始合同坐标锁定，印章/图示为模板素材。'
        : '提示：模板区每个单元格都可直接编辑，字段区用于复制参考值。'
  const rows = (isBillingInfo
    ? BILLING_INFO_FIELD_SCHEMA.map((field) => [field.label, fields[field.key] || '', field.key])
    : isProformaInvoice
      ? PROFORMA_INVOICE_FIELD_SCHEMA.map((field) => [field.label, fields[field.key] || '', field.key])
      : isPurchaseContract
        ? PURCHASE_CONTRACT_PANEL_FIELD_SCHEMA.map((field) => [field.label, fields[field.key] || '', field.key])
        : Object.entries(fields).map(([key, value]) => [key, value, key])
  )
    .map(
      ([label, value, fieldKey]) => `
        <tr>
          <td class="field-key">${escapeHTML(label)}</td>
          <td class="field-value"${isFieldSyncTemplate ? ` data-field-key="${escapeHTML(String(fieldKey))}"` : ''} contenteditable="true">${escapeHTML(value)}</td>
        </tr>
      `
    )
    .join('')

  return `
    <section class="record-panel">
      <h3>当前记录字段（可编辑）</h3>
      <p>${panelTip}</p>
      <table class="record-table">
        <thead>
          <tr>
            <th>字段</th>
            <th>值</th>
          </tr>
        </thead>
        <tbody>${rows || '<tr><td colspan="2">暂无记录字段</td></tr>'}</tbody>
      </table>
    </section>
  `
}

const buildWindowHTML = ({ title, templateHTML, recordPanelHTML, source }) => `
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHTML(title)}</title>
    <style>
      * { box-sizing: border-box; }
      body {
        margin: 0;
        padding: 0;
        background: #f5f7fa;
      }
      .toolbar {
        position: sticky;
        top: 0;
        z-index: 10;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 10px 14px;
        border-bottom: 1px solid #d9d9d9;
        background: #fff;
      }
      .toolbar button {
        height: 32px;
        padding: 0 14px;
        border: 1px solid #1f7a3f;
        background: #1f7a3f;
        color: #fff;
        border-radius: 6px;
        cursor: pointer;
      }
      .toolbar .ghost {
        border: 1px solid #8c8c8c;
        background: #fff;
        color: #262626;
      }
      .source-tag {
        display: inline-block;
        margin-left: 8px;
        padding: 2px 8px;
        border-radius: 10px;
        font-size: 12px;
        background: #e6f4ea;
        color: #1f7a3f;
      }
      .content {
        padding: 14px;
        display: grid;
        grid-template-columns: 360px 1fr;
        gap: 12px;
      }
      .record-panel {
        font-family: "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif;
        background: #fff;
        border: 1px solid #d9d9d9;
        border-radius: 8px;
        padding: 12px;
        overflow: auto;
        max-height: calc(100vh - 100px);
      }
      .record-panel h3 {
        margin: 0;
        font-size: 16px;
      }
      .record-panel p {
        margin: 8px 0 10px;
        color: #595959;
        font-size: 12px;
      }
      .record-table {
        width: 100%;
        border-collapse: collapse;
      }
      .record-table th,
      .record-table td {
        border: 1px solid #d9d9d9;
        padding: 6px;
        vertical-align: top;
        font-size: 12px;
      }
      .field-key {
        width: 36%;
        background: #fafafa;
        color: #434343;
      }
      .field-value {
        white-space: pre-wrap;
        word-break: break-word;
      }
      .template-wrap {
        background: #fff;
        border: 1px solid #d9d9d9;
        border-radius: 8px;
        padding: 0;
        overflow: auto;
        max-height: calc(100vh - 100px);
      }
      .template-wrap.template-wrap-proforma-fit {
        overflow: hidden;
      }
      .template-wrap td[contenteditable="true"],
      .template-wrap th[contenteditable="true"] {
        outline: 1px dashed transparent;
      }
      .template-wrap td[contenteditable="true"]:focus,
      .template-wrap th[contenteditable="true"]:focus {
        outline-color: #1f7a3f;
        background: #f6ffed;
      }
      .template-wrap .billing-info-template {
        display: flex;
        justify-content: center;
        min-height: 100%;
        padding: 24px 0;
        background: #d9d9d9;
      }
      .template-wrap .billing-info-paper {
        position: relative;
        width: 595px;
        height: 842px;
        background: #fff;
        box-shadow: 0 2px 14px rgba(0, 0, 0, 0.2);
      }
      .template-wrap .billing-info-canvas {
        position: relative;
        width: 100%;
        height: 100%;
        overflow: hidden;
      }
      .template-wrap .billing-logo {
        position: absolute;
        left: 412.5px;
        top: 56.1px;
        width: 128.04px;
        height: 19.14px;
        user-select: none;
        -webkit-user-drag: none;
      }
      .template-wrap .billing-stamp {
        position: absolute;
        left: 386.1px;
        top: 421.74px;
        width: 131.34px;
        height: 120.12px;
        user-select: none;
        -webkit-user-drag: none;
      }
      .template-wrap .billing-divider {
        position: absolute;
        left: 61.38px;
        top: 99px;
        width: 481.8px;
        height: 1.32px;
        background: #000;
      }
      .template-wrap .billing-text {
        position: absolute;
        color: #000;
        line-height: 1;
        white-space: nowrap;
      }
      .template-wrap .billing-editable {
        outline: 1px dashed transparent;
        border-radius: 2px;
      }
      .template-wrap .billing-editable:focus {
        outline-color: #1f7a3f;
        background: rgba(31, 122, 63, 0.08);
      }
      .template-wrap .billing-header-company-en {
        left: 64.02px;
        top: 54.12px;
        width: 340px;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 10.56px;
        font-weight: 700;
      }
      .template-wrap .billing-header-address-1 {
        left: 63.36px;
        top: 66.66px;
        width: 260px;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 6.6px;
      }
      .template-wrap .billing-header-address-2 {
        left: 63.36px;
        top: 74.58px;
        width: 260px;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 6.6px;
      }
      .template-wrap .billing-header-country {
        left: 63.36px;
        top: 82.5px;
        width: 260px;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 6.6px;
      }
      .template-wrap .billing-header-phone {
        left: 63.36px;
        top: 91.08px;
        width: 280px;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 6.6px;
      }
      .template-wrap .billing-header-website {
        left: 411.84px;
        top: 91.08px;
        width: 140px;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 6.6px;
      }
      .template-wrap .billing-title-company-cn {
        left: 217.8px;
        top: 128.38px;
        width: 180px;
        font-family: "SimSun", "Songti SC", "Noto Serif CJK SC", serif;
        font-size: 15.84px;
        font-weight: 700;
      }
      .template-wrap .billing-title-doc {
        left: 265.32px;
        top: 153.46px;
        width: 100px;
        font-family: "SimSun", "Songti SC", "Noto Serif CJK SC", serif;
        font-size: 15.84px;
        font-weight: 700;
      }
      .template-wrap .billing-label-company-name,
      .template-wrap .billing-label-tax-no,
      .template-wrap .billing-label-address,
      .template-wrap .billing-label-phone,
      .template-wrap .billing-label-bank-name,
      .template-wrap .billing-label-bank-account,
      .template-wrap .billing-value-company-name,
      .template-wrap .billing-value-address,
      .template-wrap .billing-value-bank-name,
      .template-wrap .billing-footer-company,
      .template-wrap .billing-footer-date {
        font-family: "SimSun", "Songti SC", "Noto Serif CJK SC", serif;
        font-size: 14.52px;
      }
      .template-wrap .billing-value-tax-no,
      .template-wrap .billing-value-phone,
      .template-wrap .billing-value-bank-account {
        font-family: Arial, Helvetica, sans-serif;
        font-size: 14.52px;
      }
      .template-wrap .billing-label-company-name { left: 64.02px; top: 184.8px; width: 90px; }
      .template-wrap .billing-value-company-name { left: 169.62px; top: 184.8px; width: 260px; }
      .template-wrap .billing-label-tax-no { left: 64.02px; top: 225.72px; width: 120px; }
      .template-wrap .billing-value-tax-no { left: 169.62px; top: 225.06px; width: 250px; }
      .template-wrap .billing-label-address { left: 64.02px; top: 266.64px; width: 70px; }
      .template-wrap .billing-value-address { left: 169.62px; top: 266.64px; width: 320px; }
      .template-wrap .billing-label-phone { left: 64.02px; top: 307.56px; width: 70px; }
      .template-wrap .billing-value-phone { left: 169.62px; top: 306.9px; width: 220px; }
      .template-wrap .billing-label-bank-name { left: 64.02px; top: 348.48px; width: 80px; }
      .template-wrap .billing-value-bank-name { left: 169.62px; top: 348.48px; width: 320px; }
      .template-wrap .billing-label-bank-account { left: 64.02px; top: 389.4px; width: 70px; }
      .template-wrap .billing-value-bank-account { left: 169.62px; top: 388.74px; width: 250px; }
      .template-wrap .billing-footer-company { left: 379.5px; top: 542.52px; width: 190px; }
      .template-wrap .billing-footer-date { left: 396px; top: 576.18px; width: 170px; }
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
        border: 2px solid #111;
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
        gap: 18px;
        padding: 16px 8px 2px;
        min-height: 104px;
      }
      .template-wrap .proforma-header-left {
        flex: 1;
        min-width: 0;
      }
      .template-wrap .proforma-header-company {
        font-size: 21px;
        font-weight: 700;
        letter-spacing: 0.2px;
      }
      .template-wrap .proforma-header-address {
        margin-top: 4px;
        font-size: 13.5px;
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
      .template-wrap .proforma-divider {
        border-top: 4px solid #000;
      }
      .template-wrap .proforma-title-wrap {
        padding: 14px 0 8px;
        text-align: center;
      }
      .template-wrap .proforma-title {
        font-size: 26px;
        font-weight: 700;
        letter-spacing: 0.3px;
      }
      .template-wrap .proforma-meta {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        padding: 12px 10px 12px;
        min-height: 208px;
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
        border-top: 2px solid #000;
      }
      .template-wrap .proforma-items-table th,
      .template-wrap .proforma-items-table td {
        border: 2px solid #000;
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
      }
      .template-wrap .proforma-total-words-row td {
        height: 64px;
        font-size: 13.3px;
        font-weight: 700;
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
      }
      .template-wrap .proforma-terms-table th,
      .template-wrap .proforma-terms-table td {
        border: 2px solid #000;
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
        border-left: 2px solid #000;
        border-right: 2px solid #000;
        padding: 16px 14px 8px;
        height: 249px;
      }
      .template-wrap .proforma-seller-signature {
        width: 43%;
        margin: 0 auto;
        text-align: center;
        color: #52638f;
      }
      .template-wrap .proforma-seller-company-en {
        font-size: 13px;
        font-weight: 700;
      }
      .template-wrap .proforma-seller-company-cn {
        margin-top: 3px;
        font-size: 16px;
        font-family: "SimSun", "Songti SC", "Noto Serif CJK SC", serif;
      }
      .template-wrap .proforma-seller-signer {
        margin-top: 10px;
        font-size: 22px;
        font-family: "Brush Script MT", "Segoe Script", cursive;
      }
      .template-wrap .proforma-seller-sign-line {
        margin-top: 6px;
        border-top: 2px dotted #52638f;
      }
      .template-wrap .proforma-seller-sign-note {
        margin-top: 4px;
        font-size: 10px;
        font-style: italic;
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
        border-top: 2px solid #000;
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
      .template-wrap .purchase-contract-template {
        display: flex;
        justify-content: center;
        min-height: 100%;
        padding: 24px 0;
        background: #d9d9d9;
      }
      .template-wrap .purchase-contract-paper {
        width: ${PURCHASE_CONTRACT_CANVAS_WIDTH}px;
        height: ${PURCHASE_CONTRACT_CANVAS_HEIGHT}px;
        position: relative;
        background: #fff;
        border: 1px solid #bfbfbf;
        box-shadow: 0 2px 14px rgba(0, 0, 0, 0.2);
      }
      .template-wrap .purchase-contract-canvas {
        position: relative;
        width: 100%;
        height: 100%;
        overflow: hidden;
      }
      .template-wrap .purchase-contract-grid {
        position: absolute;
        inset: 0;
        pointer-events: none;
      }
      .template-wrap .purchase-grid-line {
        position: absolute;
        background: #111;
      }
      .template-wrap .purchase-red-mark {
        position: absolute;
        border-top: 0.99px solid #ff0000;
        transform-origin: left top;
        transform: rotate(41.86deg);
        pointer-events: none;
      }
      .template-wrap .purchase-text {
        position: absolute;
        color: #000;
        font-family: "SimSun", "Songti SC", "Noto Serif CJK SC", serif;
        font-size: 7.92px;
        line-height: 1.25;
        white-space: nowrap;
      }
      .template-wrap .purchase-editable {
        outline: 1px dashed transparent;
        border-radius: 2px;
      }
      .template-wrap .purchase-editable:focus {
        outline-color: #1f7a3f;
        background: rgba(31, 122, 63, 0.08);
      }
      .template-wrap .purchase-center {
        text-align: center;
      }
      .template-wrap .purchase-right {
        text-align: right;
      }
      .template-wrap .purchase-bold {
        font-weight: 700;
      }
      .template-wrap .purchase-multiline {
        white-space: pre-wrap;
        word-break: break-word;
      }
      .template-wrap .purchase-no-wrap {
        white-space: nowrap;
      }
      .template-wrap .purchase-arial {
        font-family: Arial, Helvetica, sans-serif;
      }
      .template-wrap .purchase-calibri {
        font-family: Calibri, Arial, Helvetica, sans-serif;
      }
      .template-wrap .purchase-small {
        font-size: 6.6px;
      }
      .template-wrap .purchase-company {
        font-size: 11.88px;
        font-weight: 700;
      }
      .template-wrap .purchase-seller-name {
        font-size: 11.88px;
        font-weight: 700;
      }
      .template-wrap .purchase-title {
        font-size: 13.2px;
        font-weight: 700;
        line-height: 1;
      }
      .template-wrap .purchase-contract-logo,
      .template-wrap .purchase-contract-stamp,
      .template-wrap .purchase-contract-spec {
        position: absolute;
        user-select: none;
        -webkit-user-drag: none;
        pointer-events: none;
      }
      .template-wrap .purchase-contract-logo {
        left: ${PURCHASE_CONTRACT_IMAGE_LAYOUT.logo.left}px;
        top: ${PURCHASE_CONTRACT_IMAGE_LAYOUT.logo.top}px;
        width: ${PURCHASE_CONTRACT_IMAGE_LAYOUT.logo.width}px;
        height: ${PURCHASE_CONTRACT_IMAGE_LAYOUT.logo.height}px;
        object-fit: contain;
      }
      .template-wrap .purchase-contract-stamp {
        left: ${PURCHASE_CONTRACT_IMAGE_LAYOUT.stamp.left}px;
        top: ${PURCHASE_CONTRACT_IMAGE_LAYOUT.stamp.top}px;
        width: ${PURCHASE_CONTRACT_IMAGE_LAYOUT.stamp.width}px;
        height: ${PURCHASE_CONTRACT_IMAGE_LAYOUT.stamp.height}px;
        object-fit: contain;
      }
      .template-wrap .purchase-contract-spec {
        left: ${PURCHASE_CONTRACT_IMAGE_LAYOUT.spec.left}px;
        top: ${PURCHASE_CONTRACT_IMAGE_LAYOUT.spec.top}px;
        width: ${PURCHASE_CONTRACT_IMAGE_LAYOUT.spec.width}px;
        height: ${PURCHASE_CONTRACT_IMAGE_LAYOUT.spec.height}px;
        object-fit: contain;
      }
      body.print-template-only .record-panel {
        display: none !important;
      }
      @media print {
        @page {
          size: A4;
          margin: 0;
        }
        body {
          background: #fff;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .toolbar, .record-panel { display: none !important; }
        .content {
          display: block !important;
          padding: 0 !important;
        }
        .template-wrap {
          display: block !important;
          overflow: visible !important;
          border: 0 !important;
          border-radius: 0 !important;
          padding: 0 !important;
          max-height: none !important;
        }
        .template-wrap .billing-info-template {
          padding: 0 !important;
          background: #fff !important;
        }
        .template-wrap .billing-info-paper {
          width: 210mm !important;
          height: 297mm !important;
          box-shadow: none !important;
        }
        .template-wrap .proforma-template {
          padding: 0 !important;
          background: #fff !important;
        }
        .template-wrap .proforma-paper {
          width: 210mm !important;
          height: 297mm !important;
          box-shadow: none !important;
          padding: 0 !important;
          position: relative !important;
          left: 0 !important;
          top: 0 !important;
          transform: none !important;
        }
        .template-wrap .proforma-sheet {
          position: absolute !important;
          left: ${(PROFORMA_CANVAS_OFFSET_LEFT / PROFORMA_PAGE_WIDTH) * 100}% !important;
          top: ${(PROFORMA_CANVAS_OFFSET_TOP / PROFORMA_PAGE_HEIGHT) * 100}% !important;
          width: ${(PROFORMA_CANVAS_WIDTH / PROFORMA_PAGE_WIDTH) * 100}% !important;
          height: ${(PROFORMA_CANVAS_HEIGHT / PROFORMA_PAGE_HEIGHT) * 100}% !important;
          min-height: 0 !important;
          border-width: 0.35mm !important;
        }
        .template-wrap .proforma-items-table thead tr,
        .template-wrap .proforma-item-row,
        .template-wrap .proforma-total-title-row td,
        .template-wrap .proforma-total-words-row td,
        .template-wrap .proforma-terms-spacer-row,
        .template-wrap .proforma-terms-main-row,
        .template-wrap .proforma-terms-lead-row,
        .template-wrap .proforma-terms-notes-row {
          height: auto !important;
        }
        .template-wrap .proforma-signature-zone {
          height: auto !important;
        }
        .template-wrap .purchase-contract-template {
          padding: 0 !important;
          background: #fff !important;
        }
        .template-wrap .purchase-contract-paper {
          width: 210mm !important;
          height: 297mm !important;
          box-shadow: none !important;
          border: 0 !important;
        }
        .template-wrap .purchase-contract-canvas {
          transform: none !important;
        }
        .template-wrap .proforma-header-company { font-size: 8.4pt !important; }
        .template-wrap .proforma-header-address { font-size: 6.5pt !important; }
        .template-wrap .proforma-header-phone { font-size: 6.3pt !important; }
        .template-wrap .proforma-header-website { font-size: 6.4pt !important; }
        .template-wrap .proforma-title { font-size: 7.1pt !important; }
        .template-wrap .proforma-buyer-company { font-size: 6.4pt !important; }
        .template-wrap .proforma-buyer-address { font-size: 5.8pt !important; }
        .template-wrap .proforma-meta-table th,
        .template-wrap .proforma-meta-table td,
        .template-wrap .proforma-items-table th,
        .template-wrap .proforma-items-table td,
        .template-wrap .proforma-total-title-row td,
        .template-wrap .proforma-total-words-row td,
        .template-wrap .proforma-terms-table th,
        .template-wrap .proforma-terms-table td,
        .template-wrap .proforma-signature-label,
        .template-wrap .proforma-bank-table th,
        .template-wrap .proforma-bank-table td {
          font-size: 5.8pt !important;
        }
        .template-wrap .proforma-seller-company-en { font-size: 5.4pt !important; }
        .template-wrap .proforma-seller-company-cn { font-size: 6pt !important; }
        .template-wrap .proforma-seller-signer { font-size: 8.6pt !important; }
        .template-wrap .proforma-seller-sign-note { font-size: 4.6pt !important; }
      }
    </style>
  </head>
  <body>
    <header class="toolbar">
      <div>
        <strong>${escapeHTML(title)}</strong>
        <span class="source-tag">${source === 'server' ? '使用上传模板' : '使用默认模板'}</span>
      </div>
      <div>
        <button class="ghost" id="toggle-grid-btn">切换字段区</button>
        <button id="print-btn">打印</button>
      </div>
    </header>
    <main class="content">
      ${recordPanelHTML}
      <section class="template-wrap">
        ${templateHTML}
      </section>
    </main>
    <script>
      (function () {
        var printBtn = document.getElementById('print-btn');
        var toggleGridBtn = document.getElementById('toggle-grid-btn');
        var panel = document.querySelector('.record-panel');
        var templateWrap = document.querySelector('.template-wrap');
        var proformaTemplate = document.querySelector('.proforma-template');
        var proformaPaper = document.querySelector('.proforma-paper');
        var panelDisplayBeforePrint = null;

        var isBillingTemplate = Boolean(document.querySelector('.billing-info-template'));
        var isProformaTemplate = Boolean(document.querySelector('.proforma-template'));
        var isPurchaseTemplate = Boolean(document.querySelector('.purchase-contract-template'));
        var isFieldSyncTemplate = isBillingTemplate || isProformaTemplate || isPurchaseTemplate;
        var PROFORMA_BASE_WIDTH = ${PROFORMA_PAGE_WIDTH};
        var PROFORMA_BASE_HEIGHT = ${PROFORMA_CANVAS_OFFSET_TOP + PROFORMA_CANVAS_HEIGHT + 8};
        var proformaAutoFitRaf = 0;

        var toFieldKey = function (raw) {
          return String(raw || '')
            .trim()
            .toLowerCase();
        };

        var isMultilineFieldNode = function (node) {
          return String(node?.getAttribute?.('data-multiline') || '').toLowerCase() === 'true';
        };

        var normalizeNodeText = function (raw, multiline) {
          var text = String(raw || '')
            .replaceAll('\\u00a0', ' ')
            .replaceAll('\\r', '');
          if (multiline) {
            return text
              .split('\\n')
              .map(function (line) {
                return line.trimEnd();
              })
              .join('\\n')
              .trim();
          }
          return text
            .replaceAll('\\n', ' ')
            .replace(/\\s+/g, ' ')
            .trim();
        };

        var getNodeText = function (node, multiline) {
          return normalizeNodeText(String(node?.innerText || node?.textContent || ''), multiline);
        };

        var sanitizeEditableNode = function (node) {
          if (!node || node.getAttribute('contenteditable') !== 'true') {
            return;
          }
          var text = getNodeText(node, isMultilineFieldNode(node));
          node.textContent = text;
        };

        var insertPlainTextAtCursor = function (node, text) {
          var plain = String(text || '').replaceAll('\\r', '');
          node.focus();
          if (document.queryCommandSupported && document.queryCommandSupported('insertText')) {
            document.execCommand('insertText', false, plain);
            return;
          }
          var selection = window.getSelection();
          if (!selection || selection.rangeCount === 0) {
            node.textContent = String(node.textContent || '') + plain;
            return;
          }
          var range = selection.getRangeAt(0);
          range.deleteContents();
          range.insertNode(document.createTextNode(plain));
          range.collapse(false);
          selection.removeAllRanges();
          selection.addRange(range);
        };

        var bindEditableSanitizer = function () {
          var editableNodes = Array.prototype.slice.call(document.querySelectorAll('[contenteditable="true"]'));
          editableNodes.forEach(function (node) {
            sanitizeEditableNode(node);
            node.addEventListener('paste', function (event) {
              event.preventDefault();
              var clipboardText =
                event.clipboardData?.getData('text/plain') || window.clipboardData?.getData('Text') || '';
              insertPlainTextAtCursor(node, clipboardText);
              sanitizeEditableNode(node);
            });
            node.addEventListener('blur', function () {
              sanitizeEditableNode(node);
            });
          });
        };

        var applyProformaAutoFit = function () {
          if (!isProformaTemplate || !templateWrap || !proformaTemplate || !proformaPaper) {
            return;
          }
          var wrapRect = templateWrap.getBoundingClientRect();
          var availableWidth = Math.max(wrapRect.width - 24, 320);
          var availableHeight = Math.max(wrapRect.height - 24, 320);
          var scale = Math.min(availableWidth / PROFORMA_BASE_WIDTH, availableHeight / PROFORMA_BASE_HEIGHT, 1);
          var roundedScale = Number(scale.toFixed(4));
          var topPadding = 4;
          var bottomPadding = 4;
          var scaledHeight = Math.round(PROFORMA_BASE_HEIGHT * roundedScale);

          templateWrap.classList.add('template-wrap-proforma-fit');
          proformaPaper.style.transform = 'translateX(-50%) scale(' + roundedScale + ')';
          proformaTemplate.style.paddingTop = String(topPadding) + 'px';
          proformaTemplate.style.paddingBottom = String(bottomPadding) + 'px';
          proformaTemplate.style.height = String(scaledHeight + topPadding + bottomPadding) + 'px';
        };

        var scheduleProformaAutoFit = function () {
          if (!isProformaTemplate) {
            return;
          }
          if (proformaAutoFitRaf) {
            window.cancelAnimationFrame(proformaAutoFitRaf);
          }
          proformaAutoFitRaf = window.requestAnimationFrame(function () {
            proformaAutoFitRaf = 0;
            applyProformaAutoFit();
          });
        };

        var collectPanelFieldMap = function () {
          var cells = Array.prototype.slice.call(
            document.querySelectorAll('.field-value[data-field-key]')
          );
          var fieldMap = {};
          cells.forEach(function (cell) {
            var key = toFieldKey(cell.getAttribute('data-field-key'));
            if (key) {
              fieldMap[key] = cell;
            }
          });
          return fieldMap;
        };

        var collectTemplateFieldMap = function () {
          var nodes = Array.prototype.slice.call(document.querySelectorAll('[data-billing-field]'));
          var fieldMap = {};
          nodes.forEach(function (node) {
            var key = toFieldKey(node.getAttribute('data-billing-field'));
            if (!key) {
              return;
            }
            if (!fieldMap[key]) {
              fieldMap[key] = [];
            }
            fieldMap[key].push(node);
          });
          return fieldMap;
        };

        var normalizeDateCN = function (raw) {
          var text = String(raw || '').trim();
          if (!text) {
            return '';
          }

          if (/^\\d{10,13}$/.test(text)) {
            var ts = Number(text);
            if (!Number.isNaN(ts)) {
              var millis = text.length === 10 ? ts * 1000 : ts;
              var dateFromTs = new Date(millis);
              if (!Number.isNaN(dateFromTs.getTime())) {
                return (
                  String(dateFromTs.getFullYear()) +
                  '年' +
                  String(dateFromTs.getMonth() + 1) +
                  '月' +
                  String(dateFromTs.getDate()) +
                  '日'
                );
              }
            }
          }

          var dateMatch = text.match(/^(\\d{4})[-\\/.](\\d{1,2})[-\\/.](\\d{1,2})$/);
          if (dateMatch) {
            return (
              String(Number(dateMatch[1])) +
              '年' +
              String(Number(dateMatch[2])) +
              '月' +
              String(Number(dateMatch[3])) +
              '日'
            );
          }

          return text;
        };

        var normalizeDateEN = function (raw) {
          var text = String(raw || '').trim();
          if (!text) {
            return '';
          }

          var months = [
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
            'December'
          ];

          if (/^\\d{10,13}$/.test(text)) {
            var ts = Number(text);
            if (!Number.isNaN(ts)) {
              var millis = text.length === 10 ? ts * 1000 : ts;
              var dateFromTs = new Date(millis);
              if (!Number.isNaN(dateFromTs.getTime())) {
                return (
                  months[dateFromTs.getMonth()] +
                  ' ' +
                  String(dateFromTs.getDate()) +
                  ', ' +
                  String(dateFromTs.getFullYear())
                );
              }
            }
          }

          var dateMatch = text.match(/^(\\d{4})[-\\/.](\\d{1,2})[-\\/.](\\d{1,2})$/);
          if (dateMatch) {
            var year = Number(dateMatch[1]);
            var month = Number(dateMatch[2]);
            var day = Number(dateMatch[3]);
            if (month >= 1 && month <= 12) {
              return months[month - 1] + ' ' + String(day) + ', ' + String(year);
            }
          }

          var parsed = new Date(text);
          if (!Number.isNaN(parsed.getTime())) {
            return (
              months[parsed.getMonth()] +
              ' ' +
              String(parsed.getDate()) +
              ', ' +
              String(parsed.getFullYear())
            );
          }

          return text;
        };

        var normalizeDateSlash = function (raw) {
          var text = String(raw || '').trim();
          if (!text) {
            return '';
          }
          var dateMatch = text.match(/^(\\d{4})[-\\/.](\\d{1,2})[-\\/.](\\d{1,2})$/);
          if (dateMatch) {
            return (
              String(Number(dateMatch[1])) +
              '/' +
              String(Number(dateMatch[2])).padStart(2, '0') +
              '/' +
              String(Number(dateMatch[3])).padStart(2, '0')
            );
          }
          var parsed = new Date(text);
          if (!Number.isNaN(parsed.getTime())) {
            return (
              String(parsed.getFullYear()) +
              '/' +
              String(parsed.getMonth() + 1).padStart(2, '0') +
              '/' +
              String(parsed.getDate()).padStart(2, '0')
            );
          }
          return text;
        };

        var normalizeTemplateFieldValue = function (fieldKey, value) {
          if (fieldKey === 'signdate') {
            return normalizeDateCN(value);
          }
          if (fieldKey === 'requireddeliverydate' || fieldKey === 'sellerconfirmdeliverydate') {
            return normalizeDateSlash(value);
          }
          if (fieldKey === 'date') {
            return isProformaTemplate ? normalizeDateEN(value) : normalizeDateCN(value);
          }
          return String(value || '').trim();
        };

        var syncPanelFieldToTemplate = function (fieldKey, normalizeValue) {
          if (!isFieldSyncTemplate) {
            return;
          }
          var panelMap = collectPanelFieldMap();
          var templateMap = collectTemplateFieldMap();
          var cell = panelMap[fieldKey];
          if (!cell) {
            return;
          }
          var rawValue = getNodeText(cell, false);
          var value = normalizeValue ? normalizeTemplateFieldValue(fieldKey, rawValue) : rawValue;
          if (normalizeValue && value !== rawValue) {
            cell.textContent = value;
          }
          var nodes = templateMap[fieldKey] || [];
          nodes.forEach(function (node) {
            if (node === document.activeElement && !normalizeValue) {
              return;
            }
            node.textContent = value;
          });
        };

        var syncTemplateFieldToPanel = function (fieldKey, sourceNode, normalizeValue) {
          if (!isFieldSyncTemplate) {
            return;
          }
          var panelMap = collectPanelFieldMap();
          var templateMap = collectTemplateFieldMap();
          var rawValue = getNodeText(sourceNode, isMultilineFieldNode(sourceNode));
          var value = normalizeValue ? normalizeTemplateFieldValue(fieldKey, rawValue) : rawValue;

          if (normalizeValue && value !== rawValue) {
            sourceNode.textContent = value;
          }

          var panelCell = panelMap[fieldKey];
          if (panelCell && panelCell !== document.activeElement) {
            panelCell.textContent = value;
          }

          var nodes = templateMap[fieldKey] || [];
          nodes.forEach(function (node) {
            if (node === sourceNode || node === document.activeElement) {
              return;
            }
            node.textContent = value;
          });
        };

        var syncAllBillingFieldsFromPanel = function () {
          if (!isFieldSyncTemplate) {
            return;
          }
          var panelMap = collectPanelFieldMap();
          Object.keys(panelMap).forEach(function (fieldKey) {
            syncPanelFieldToTemplate(fieldKey, true);
          });
        };

        var bindBillingSync = function () {
          if (!isFieldSyncTemplate) {
            return;
          }
          var panelMap = collectPanelFieldMap();
          Object.keys(panelMap).forEach(function (fieldKey) {
            var cell = panelMap[fieldKey];
            cell.addEventListener('input', function () {
              syncPanelFieldToTemplate(fieldKey, false);
            });
            cell.addEventListener('blur', function () {
              syncPanelFieldToTemplate(fieldKey, true);
            });
          });

          var templateMap = collectTemplateFieldMap();
          Object.keys(templateMap).forEach(function (fieldKey) {
            templateMap[fieldKey].forEach(function (node) {
              node.addEventListener('input', function () {
                syncTemplateFieldToPanel(fieldKey, node, false);
              });
              node.addEventListener('blur', function () {
                syncTemplateFieldToPanel(fieldKey, node, true);
              });
            });
          });

          syncAllBillingFieldsFromPanel();
        };

        var enableTemplateOnlyPrint = function () {
          document.body.classList.add('print-template-only');
          if (panel) {
            panelDisplayBeforePrint = panel.style.display;
            panel.style.display = 'none';
          }
        };

        var restorePrintLayout = function () {
          document.body.classList.remove('print-template-only');
          if (panel && panelDisplayBeforePrint !== null) {
            panel.style.display = panelDisplayBeforePrint;
            panelDisplayBeforePrint = null;
          }
          scheduleProformaAutoFit();
        };

        window.addEventListener('afterprint', restorePrintLayout);
        window.addEventListener('resize', scheduleProformaAutoFit);

        if (printBtn) {
          printBtn.addEventListener('click', function () {
            syncAllBillingFieldsFromPanel();
            enableTemplateOnlyPrint();
            window.print();
            setTimeout(restorePrintLayout, 0);
          });
        }
        if (toggleGridBtn && panel) {
          toggleGridBtn.addEventListener('click', function () {
            panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
            scheduleProformaAutoFit();
          });
        }
        bindEditableSanitizer();
        bindBillingSync();
        scheduleProformaAutoFit();
      })();
    </script>
  </body>
</html>
`

export const openPrintWindow = async (templateKey, record = {}) => {
  const templateMeta = templateList.find((item) => item.key === templateKey)
  const title = templateMeta?.title || '打印模板'
  const { source, templateHTML } = await fetchTemplateHTML(templateKey, record)
  const recordPanelHTML = buildRecordPanelHTML(record, templateKey)

  const popup = window.open('', '_blank', 'width=1440,height=900')
  if (!popup) {
    throw new Error('浏览器拦截了弹窗，请允许弹窗后重试')
  }

  popup.document.open()
  popup.document.write(
    buildWindowHTML({
      title,
      templateHTML,
      recordPanelHTML,
      source,
    })
  )
  popup.document.close()
  popup.focus()
}

export const uploadTemplateFile = async (templateKey, file) => {
  if (FIXED_LAYOUT_TEMPLATE_KEYS.has(templateKey)) {
    if (templateKey === 'billingInfo') {
      throw new Error('开票信息模板为固定版式，不支持上传覆盖')
    }
    if (templateKey === 'pi') {
      throw new Error('外销形式发票模板为固定版式，不支持上传覆盖')
    }
    if (templateKey === 'purchase') {
      throw new Error('采购合同模板为固定版式，不支持上传覆盖')
    }
    throw new Error('当前模板为固定版式，不支持上传覆盖')
  }
  const authToken = getToken(AUTH_SCOPE.ADMIN)
  if (!authToken) {
    throw new Error('请先登录管理员账号')
  }
  const formData = new FormData()
  formData.append('file', file)

  const resp = await fetch(`/templates/upload/${templateKey}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
    body: formData,
  })
  const payload = await resp.json().catch(() => ({}))
  if (!resp.ok || Number(payload?.code) !== 0) {
    throw new Error(payload?.message || '模板上传失败')
  }
  return payload?.data || {}
}

export const __TEST_ONLY__ = {
  buildTemplateHTMLFromResponse,
  buildBillingInfoFields,
  buildProformaInvoiceFields,
  buildPurchaseContractFields,
}
