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

const buildBillingInfoFields = (record = {}) => {
  const flattened = flattenRecord(record)
  const flattenedMap = {}
  Object.entries(flattened).forEach(([key, value]) => {
    flattenedMap[normalizeFieldKey(key)] = String(value).trim()
  })

  const values = {}
  const hasExplicit = {}

  BILLING_INFO_FIELD_SCHEMA.forEach((field) => {
    const matched = (field.aliases || [])
      .map((alias) => flattenedMap[normalizeFieldKey(alias)] || '')
      .find((value) => value !== '')
    hasExplicit[field.key] = Boolean(matched)
    values[field.key] = matched || field.defaultValue
  })

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

const buildTemplateHTMLFromResponse = (templateKey, arrayBuffer, contentType = '') => {
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
    if (templateKey === 'billingInfo') {
      return withEditableCells(DEFAULT_BILLING_INFO_TEMPLATE_HTML)
    }
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

const fetchTemplateHTML = async (templateKey) => {
  if (templateKey === 'billingInfo') {
    return { source: 'default', templateHTML: DEFAULT_BILLING_INFO_TEMPLATE_HTML }
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
        serverResp.contentType
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
    fallbackResp.contentType
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

const buildRecordPanelHTML = (record, templateKey) => {
  const isBillingInfo = templateKey === 'billingInfo'
  const fields = isBillingInfo ? buildBillingInfoFields(record) : flattenRecord(record)
  const panelTip = isBillingInfo
    ? '提示：左右两侧字段双向同步，右侧文本均可编辑（logo/水印除外），打印时仅输出右侧模板。'
    : '提示：模板区每个单元格都可直接编辑，字段区用于复制参考值。'
  const rows = (isBillingInfo
    ? BILLING_INFO_FIELD_SCHEMA.map((field) => [field.label, fields[field.key] || '', field.key])
    : Object.entries(fields).map(([key, value]) => [key, value, key])
  )
    .map(
      ([label, value, fieldKey]) => `
        <tr>
          <td class="field-key">${escapeHTML(label)}</td>
          <td class="field-value" data-field-key="${escapeHTML(String(fieldKey))}" contenteditable="true">${escapeHTML(value)}</td>
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
        var panelDisplayBeforePrint = null;

        var isBillingTemplate = Boolean(document.querySelector('.billing-info-template'));

        var toFieldKey = function (raw) {
          return String(raw || '')
            .trim()
            .toLowerCase();
        };

        var getNodeText = function (node) {
          return String(node?.innerText || node?.textContent || '')
            .replaceAll('\\n', ' ')
            .trim();
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

        var normalizeDate = function (raw) {
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

        var normalizeBillingFieldValue = function (fieldKey, value) {
          if (fieldKey === 'date') {
            return normalizeDate(value);
          }
          return String(value || '').trim();
        };

        var syncPanelFieldToTemplate = function (fieldKey, normalizeValue) {
          if (!isBillingTemplate) {
            return;
          }
          var panelMap = collectPanelFieldMap();
          var templateMap = collectTemplateFieldMap();
          var cell = panelMap[fieldKey];
          if (!cell) {
            return;
          }
          var rawValue = getNodeText(cell);
          var value = normalizeValue ? normalizeBillingFieldValue(fieldKey, rawValue) : rawValue;
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
          if (!isBillingTemplate) {
            return;
          }
          var panelMap = collectPanelFieldMap();
          var templateMap = collectTemplateFieldMap();
          var rawValue = getNodeText(sourceNode);
          var value = normalizeValue ? normalizeBillingFieldValue(fieldKey, rawValue) : rawValue;

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
          if (!isBillingTemplate) {
            return;
          }
          var panelMap = collectPanelFieldMap();
          Object.keys(panelMap).forEach(function (fieldKey) {
            syncPanelFieldToTemplate(fieldKey, true);
          });
        };

        var bindBillingSync = function () {
          if (!isBillingTemplate) {
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
        };

        window.addEventListener('afterprint', restorePrintLayout);

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
          });
        }
        bindBillingSync();
      })();
    </script>
  </body>
</html>
`

export const openPrintWindow = async (templateKey, record = {}) => {
  const templateMeta = templateList.find((item) => item.key === templateKey)
  const title = templateMeta?.title || '打印模板'
  const { source, templateHTML } = await fetchTemplateHTML(templateKey)
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
  if (templateKey === 'billingInfo') {
    throw new Error('开票信息模板为固定版式，不支持上传覆盖')
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
}
