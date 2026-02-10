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
  <table style="border-collapse: collapse; width: 100%; max-width: 980px; margin: 16px auto; font-size: 14px;">
    <thead>
      <tr>
        <th colspan="2" style="border: 1px solid #222; padding: 10px; font-size: 20px;">杭州科森磁材开票信息</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="border: 1px solid #222; padding: 10px; width: 28%;">单位名称</td>
        <td style="border: 1px solid #222; padding: 10px;">杭州科森磁材有限公司</td>
      </tr>
      <tr>
        <td style="border: 1px solid #222; padding: 10px;">税号</td>
        <td style="border: 1px solid #222; padding: 10px;">91330109MA7N1W9P5Y</td>
      </tr>
      <tr>
        <td style="border: 1px solid #222; padding: 10px;">地址、电话</td>
        <td style="border: 1px solid #222; padding: 10px;">浙江省杭州市萧山区北干街道永久路288号912室 0571-86790529</td>
      </tr>
      <tr>
        <td style="border: 1px solid #222; padding: 10px;">开户行及账号</td>
        <td style="border: 1px solid #222; padding: 10px;">中国农业银行杭州金城路支行 19085201040039051</td>
      </tr>
      <tr>
        <td style="border: 1px solid #222; padding: 10px;">备注</td>
        <td style="border: 1px solid #222; padding: 10px;">所有字段均可直接编辑后打印。</td>
      </tr>
    </tbody>
  </table>
`

const buildRecordPanelHTML = (record) => {
  const fields = flattenRecord(record)
  const rows = Object.entries(fields)
    .map(
      ([key, value]) => `
        <tr>
          <td class="field-key">${escapeHTML(key)}</td>
          <td class="field-value" contenteditable="true">${escapeHTML(value)}</td>
        </tr>
      `
    )
    .join('')

  return `
    <section class="record-panel">
      <h3>当前记录字段（可编辑）</h3>
      <p>提示：模板区每个单元格都可直接编辑，字段区用于复制参考值。</p>
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
      @media print {
        @page {
          margin: 0;
        }
        body { background: #fff; }
        .toolbar, .record-panel { display: none; }
        .content {
          display: block;
          padding: 0;
        }
        .template-wrap {
          border: 0;
          border-radius: 0;
          padding: 0;
          max-height: none;
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
        if (printBtn) {
          printBtn.addEventListener('click', function () {
            window.print();
          });
        }
        if (toggleGridBtn && panel) {
          toggleGridBtn.addEventListener('click', function () {
            panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
          });
        }
      })();
    </script>
  </body>
</html>
`

export const openPrintWindow = async (templateKey, record = {}) => {
  const templateMeta = templateList.find((item) => item.key === templateKey)
  const title = templateMeta?.title || '打印模板'
  const { source, templateHTML } = await fetchTemplateHTML(templateKey)
  const recordPanelHTML = buildRecordPanelHTML(record)

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
