export const printTemplates = [
  {
    key: 'quotation',
    title: '报价单',
    documentNo: 'QT-20260209-0001',
    customer: 'Kosen Magnet Europe GmbH',
    date: '2026-02-09',
    rows: [
      { no: 1, item: 'Neodymium magnet assembly', qty: 1200, unitPrice: 'USD 5.60', amount: 'USD 6,720.00' },
    ],
    footer: '报价有效期 30 天。',
  },
  {
    key: 'pi',
    title: '形式发票 PI',
    documentNo: 'PI-20260209-0001',
    customer: 'Kosen Magnet Europe GmbH',
    date: '2026-02-09',
    rows: [
      { no: 1, item: 'Neodymium magnet assembly', qty: 1200, unitPrice: 'USD 5.60', amount: 'USD 6,720.00' },
    ],
    footer: 'Payment: 30% prepaid, 70% before shipment.',
  },
  {
    key: 'purchase',
    title: '采购合同',
    documentNo: 'CG-20260209-0001',
    customer: '宁波新磁科技有限公司',
    date: '2026-02-10',
    rows: [
      { no: 1, item: 'Neodymium magnet assembly', qty: 1200, unitPrice: 'CNY 28.00', amount: 'CNY 33,600.00' },
    ],
    footer: '交货地点：杭州临平仓。',
  },
  {
    key: 'invoice',
    title: '商业发票 Commercial Invoice',
    documentNo: 'CY-20260209-0001',
    customer: 'Kosen Magnet Europe GmbH',
    date: '2026-02-20',
    rows: [
      { no: 1, item: 'Neodymium magnet assembly', qty: 1100, unitPrice: 'USD 5.60', amount: 'USD 6,160.00' },
    ],
    footer: 'SHIP TO: Germany Hamburg Logistics Center',
  },
  {
    key: 'packing',
    title: '装箱单 Packing List',
    documentNo: 'PK-20260220-0001',
    customer: 'Kosen Magnet Europe GmbH',
    date: '2026-02-20',
    rows: [
      { no: 1, item: 'Wooden Case No.1-40', qty: 40, unitPrice: 'N/A', amount: 'Gross 2,260kg' },
    ],
    footer: 'Marking: KOSEN/PO01/NO.1-40',
  },
  {
    key: 'delivery',
    title: '送货单',
    documentNo: 'DL-20260220-0001',
    customer: '杭州一号仓',
    date: '2026-02-20',
    rows: [
      { no: 1, item: 'Neodymium magnet assembly', qty: 1100, unitPrice: 'N/A', amount: '已出库' },
    ],
    footer: '仓库签收后生效。',
  },
]

export const printCss = `
* {
  box-sizing: border-box;
}
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
  margin: 16px 0;
  font-size: 14px;
}
.print-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 8px;
}
.print-table th,
.print-table td {
  border: 1px solid #4b5563;
  padding: 8px;
  font-size: 13px;
  text-align: left;
}
.print-footer {
  margin-top: 16px;
  font-size: 13px;
}
` 
