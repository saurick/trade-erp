import { calcItemsTotal } from '../utils/items'

const companyInfo = {
  name: '杭州科森磁材有限公司',
  nameEn: 'HANGZHOU KESEN MAGNETICS CO., LTD.',
  taxNo: '91330109MA7N1W9P5Y',
  address: '浙江省杭州市萧山区北干街道永久路288号912室',
  addressEn: '288 YONGJIU ROAD, HANGZHOU, ZHEJIANG 311202, CHINA',
  phone: '0571-86790529',
  phoneEn: '+86 571 8679 0529',
  bankName: '中国农业银行杭州金城路支行',
  bankAccount: '19085201040039051',
  website: 'WWW.KSMAGNETIC.COM',
}

const calcRowAmount = (row) => {
  const qty = Number(row.qty || row.quantity || 0)
  const price = Number(row.unitPrice || 0)
  return qty * price
}

const normalizeRows = (items = []) => {
  return items.map((item, index) => ({
    no: index + 1,
    name: item.productName || item.productModel || item.cnDesc || item.enDesc || '',
    qty: item.quantity || 0,
    unitPrice: item.unitPrice || 0,
    amount: item.totalPrice || calcRowAmount(item),
    packDetail: item.packDetail || '',
    netWeight: item.netWeight || '',
    grossWeight: item.grossWeight || '',
    volume: item.volume || '',
  }))
}

const buildTemplate = (title, record, extraMeta = [], rows = []) => {
  return {
    title,
    documentNo: record?.code || record?.invoiceNo || '-',
    date: record?.quotedDate || record?.signDate || record?.shipDate || record?.warehouseShipDate || '-',
    customer: record?.customerName || record?.supplierName || '-',
    meta: [
      { label: '公司名称', value: companyInfo.name },
      { label: '税号', value: companyInfo.taxNo },
      { label: '地址', value: companyInfo.address },
      { label: '电话', value: companyInfo.phone },
      ...extraMeta,
    ],
    rows,
  }
}

export const templateList = [
  { key: 'quotation', title: '报价单' },
  { key: 'pi', title: '形式发票 PI' },
  { key: 'purchase', title: '采购合同' },
  { key: 'invoice', title: '商业发票 Commercial Invoice' },
  { key: 'packing', title: '装箱单 Packing List' },
  { key: 'delivery', title: '送货单' },
  { key: 'production', title: '生产加工申请单' },
]

export const buildTemplateData = (templateKey, record) => {
  const rows = normalizeRows(record?.items || [])

  switch (templateKey) {
    case 'quotation':
      return buildTemplate('报价单', record, [
        { label: '联系人', value: record?.contactName || '-' },
        { label: '联系方式', value: record?.contactTel || '-' },
        { label: '邮箱', value: record?.contactEmail || '-' },
        { label: '币种', value: record?.currency || '-' },
        { label: '运输条款', value: record?.priceTerm || '-' },
        { label: '付款方式', value: record?.payMode || '-' },
        { label: '有效期(天)', value: record?.validPeriod || '-' },
      ], rows)
    case 'pi':
      return buildTemplate('形式发票 PI', record, [
        { label: '预收款比例', value: record?.prepayRatio ? `${record.prepayRatio}%` : '-' },
        { label: '运输条款', value: record?.priceTerm || '-' },
        { label: '付款方式', value: record?.paymentMethod || record?.payMode || '-' },
      ], rows)
    case 'purchase':
      return buildTemplate('采购合同', record, [
        { label: '供应商', value: record?.supplierName || '-' },
        { label: '交货日期', value: record?.deliveryDate || '-' },
        { label: '交货地点', value: record?.deliveryAddress || '-' },
      ], rows)
    case 'invoice':
      return buildTemplate('商业发票 Commercial Invoice', record, [
        { label: 'SHIP TO', value: record?.shipToAddress || '-' },
        { label: '运抵国', value: record?.arriveCountry || '-' },
        { label: '唛头', value: record?.marking || '-' },
      ], rows)
    case 'packing':
      return buildTemplate('装箱单 Packing List', record, [
        { label: '总件数', value: record?.totalPackages || '-' },
        { label: '木箱尺寸', value: record?.woodCaseSize || '-' },
      ], rows)
    case 'delivery':
      return buildTemplate('送货单', record, [
        { label: '仓库', value: record?.warehouseName || '杭州一号仓' },
        { label: '货位', value: record?.location || '-' },
      ], rows)
    case 'production':
      return buildTemplate('生产加工申请单', record, [
        { label: '合同编号', value: record?.code || '-' },
        { label: '订单号', value: record?.orderNo || '-' },
        { label: '备货期限', value: record?.deliveryDate || '-' },
      ], rows)
    default:
      return buildTemplate('模板', record, [], rows)
  }
}

export const printCss = `
* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: 'Noto Sans SC', 'PingFang SC', sans-serif;
  color: #1f2937;
}
.print-sheet {
  width: 210mm;
  min-height: 297mm;
  margin: 0 auto;
  padding: 12mm;
}
.print-title {
  text-align: center;
  margin: 0;
  font-size: 24px;
}
.print-meta {
  display: flex;
  justify-content: space-between;
  margin: 12px 0;
  font-size: 13px;
  gap: 12px;
  flex-wrap: wrap;
}
.print-meta-item {
  min-width: 45%;
}
.print-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 8px;
}
.print-table th,
.print-table td {
  border: 1px solid #4b5563;
  padding: 6px;
  font-size: 12px;
  text-align: left;
}
.print-footer {
  margin-top: 12px;
  font-size: 12px;
  color: #475569;
}
`

const renderSheet = (template) => {
  const metaHtml = template.meta
    .map((item) => `<div class="print-meta-item">${item.label}：${item.value || '-'}</div>`)
    .join('')

  const rowsHtml = template.rows
    .map(
      (row) => `
      <tr>
        <td>${row.no}</td>
        <td>${row.name}</td>
        <td>${row.qty}</td>
        <td>${row.unitPrice}</td>
        <td>${row.amount}</td>
        <td>${row.packDetail}</td>
        <td>${row.netWeight}</td>
        <td>${row.grossWeight}</td>
        <td>${row.volume}</td>
      </tr>
    `
    )
    .join('')

  const totalAmount = calcItemsTotal(template.rows || [], 'qty', 'unitPrice')

  return `
  <section class="print-sheet">
    <h1 class="print-title">${template.title}</h1>
    <div class="print-meta">
      <div class="print-meta-item">单号：${template.documentNo}</div>
      <div class="print-meta-item">日期：${template.date}</div>
      <div class="print-meta-item">客户/对象：${template.customer}</div>
      <div class="print-meta-item">网站：${companyInfo.website}</div>
    </div>
    <div class="print-meta">${metaHtml}</div>
    <table class="print-table">
      <thead>
        <tr>
          <th>序号</th>
          <th>品名/型号</th>
          <th>数量</th>
          <th>单价</th>
          <th>金额</th>
          <th>包装</th>
          <th>净重</th>
          <th>毛重</th>
          <th>体积</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>
    <p class="print-footer">合计金额：${totalAmount}</p>
  </section>
`
}

export const openPrintWindow = (templateKey, record) => {
  const template = buildTemplateData(templateKey, record || {})
  const printWindow = window.open('', '_blank', 'width=1024,height=768')
  if (!printWindow) {
    return
  }

  const html = `
    <html>
      <head>
        <title>${template.title}</title>
        <style>${printCss}</style>
      </head>
      <body>
        ${renderSheet(template)}
      </body>
    </html>
  `

  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.focus()
  printWindow.print()
  printWindow.close()
}
