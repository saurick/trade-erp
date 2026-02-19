import { describe, expect, it } from 'vitest'
import { __TEST_ONLY__, uploadTemplateFile } from './printTemplates'

const {
  buildTemplateHTMLFromResponse,
  buildBillingInfoFields,
  buildProformaInvoiceFields,
  buildPurchaseContractFields,
} = __TEST_ONLY__

const toArrayBuffer = (text) => new TextEncoder().encode(text).buffer

describe('printTemplates', () => {
  it('billingInfo 遇到 PDF 时返回固定版式模板', () => {
    const pdfHeader = Uint8Array.from([
      0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x33,
    ]).buffer
    const html = buildTemplateHTMLFromResponse(
      'billingInfo',
      pdfHeader,
      'application/pdf'
    )
    expect(html).toContain('billing-info-template')
    expect(html).toContain('billing-info-canvas')
    expect(html).toContain('/templates/billing-info-logo.png')
    expect(html).toContain('/templates/billing-info-stamp.png')
  })

  it('pi 使用固定版式模板', () => {
    const pdfHeader = Uint8Array.from([
      0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x33,
    ]).buffer
    const html = buildTemplateHTMLFromResponse(
      'pi',
      pdfHeader,
      'application/pdf'
    )
    expect(html).toContain('proforma-template')
    expect(html).toContain('PROFORMA INVOICE')
    expect(html).toContain('/templates/billing-info-logo.png')
  })

  it('purchase 使用固定版式模板', () => {
    const pdfHeader = Uint8Array.from([
      0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x33,
    ]).buffer
    const html = buildTemplateHTMLFromResponse(
      'purchase',
      pdfHeader,
      'application/pdf'
    )
    expect(html).toContain('purchase-contract-template')
    expect(html).toContain('purchase-contract-grid')
    expect(html).toContain('/templates/purchase-contract-logo.png')
    expect(html).toContain('/templates/purchase-contract-stamp.png')
    expect(html).toContain('/templates/purchase-contract-spec.png')
    expect(html).toContain('purchase-title purchase-center')
    expect(html).toContain(
      'contenteditable="true" spellcheck="false">采购合同</div>'
    )
    expect(html).toContain(
      'contenteditable="true" spellcheck="false" data-multiline="true">其他条款:<br />1.'
    )
  })

  it('非 billingInfo 遇到 PDF 时抛出错误', () => {
    const pdfHeader = Uint8Array.from([
      0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x33,
    ]).buffer
    expect(() =>
      buildTemplateHTMLFromResponse('invoice', pdfHeader, 'application/pdf')
    ).toThrow('当前模板是 PDF')
  })

  it('HTML 模板会自动给单元格加可编辑属性', () => {
    const rawHTML =
      '<!doctype html><html><body><table><tbody><tr><td>1</td></tr></tbody></table></body></html>'
    const html = buildTemplateHTMLFromResponse(
      'invoice',
      toArrayBuffer(rawHTML),
      'text/html'
    )
    expect(html).toContain(
      '<td contenteditable="true" spellcheck="false">1</td>'
    )
  })

  it('billingInfo 不支持上传覆盖', async () => {
    await expect(
      uploadTemplateFile('billingInfo', new Blob(['test']))
    ).rejects.toThrow('开票信息模板为固定版式，不支持上传覆盖')
  })

  it('pi 不支持上传覆盖', async () => {
    await expect(uploadTemplateFile('pi', new Blob(['test']))).rejects.toThrow(
      '外销形式发票模板为固定版式，不支持上传覆盖'
    )
  })

  it('purchase 不支持上传覆盖', async () => {
    await expect(
      uploadTemplateFile('purchase', new Blob(['test']))
    ).rejects.toThrow('采购合同模板为固定版式，不支持上传覆盖')
  })

  it('未启用模板不支持上传覆盖', async () => {
    await expect(
      uploadTemplateFile('invoice', new Blob(['test']))
    ).rejects.toThrow('当前仅保留 PI、采购合同、开票信息模板')
  })

  it('billingInfo 字段会从记录里映射并格式化日期', () => {
    const fields = buildBillingInfoFields({
      name: '杭州科森磁材有限公司11',
      taxNo: '91330109MA7N1W9P5Y111',
      address: '浙江省杭州市萧山区北干街道永久路288号912室',
      contactPhone: '18058808575',
      created_at: '1770714077',
    })
    expect(fields.companyName).toBe('杭州科森磁材有限公司11')
    expect(fields.taxNo).toBe('91330109MA7N1W9P5Y111')
    expect(fields.phone).toBe('18058808575')
    expect(fields.titleCompanyCn).toBe('杭州科森磁材有限公司11')
    expect(fields.footerCompanyName).toBe('杭州科森磁材有限公司11')
    expect(fields.date).toMatch(/^\d{4}年\d{1,2}月\d{1,2}日$/)
  })

  it('pi 字段会从记录里映射并计算金额', () => {
    const fields = buildProformaInvoiceFields({
      code: 'PI-20260210-01',
      customerName: 'TEST CUSTOMER',
      customerAddress: 'BARCELONA SPAIN',
      contactTel: '+34 1234567',
      signDate: '2026-01-15',
      paymentMethod: 'T/T 30% + 70%',
      transportType: 'FedEx',
      priceTerm: 'DAP',
      endPlace: 'Barcelona,Spain',
      items: [
        {
          refNo: 'A001',
          enDesc: 'TEST PRODUCT A',
          quantity: 2,
          unitPrice: 1.5,
        },
        {
          refNo: 'B002',
          enDesc: 'TEST PRODUCT B',
          quantity: 3,
          unitPrice: 2,
        },
      ],
    })

    expect(fields.invoiceNo).toBe('PI-20260210-01')
    expect(fields.orderNo).toBe('PI-20260210-01')
    expect(fields.buyerCompanyName).toBe('TEST CUSTOMER')
    expect(fields.buyerAddressTel).toContain('BARCELONA SPAIN')
    expect(fields.date).toBe('January 15, 2026')
    expect(fields.item1Ref).toBe('A001')
    expect(fields.item2Ref).toBe('B002')
    expect(fields.item1NetPrice).toBe('$1.5000')
    expect(fields.item2NetPrice).toBe('$2.0000')
    expect(fields.totalNetValue).toBe('US$9.00')
    expect(fields.amountInWords).toContain('SAY US DOLLARS')
    expect(fields.deliveryMethod).toBe('By FedEx')
  })

  it('purchase 字段会从记录里映射并格式化', () => {
    const fields = buildPurchaseContractFields({
      code: 'CG20260210001',
      supplierName: '宁波测试供应商',
      supplierAddress: '宁波市海曙区测试路66号',
      supplierPhone: '0574-12345678',
      signDate: '2026-01-04',
      priceTerm: '含13%增值税及运费',
      settlement: '月结45天',
      deliveryDate: '2026-03-05',
      deliveryAddress: '杭州临平仓',
      remark: '请按图纸执行',
      items: [
        {
          productName: '钕铁硼磁钢',
          specCode: 'D9.525XD3.048X3.175',
          quantity: 120,
          unitPrice: 1.23,
          totalPrice: 147.6,
          packDetail: '八孔泡沫箱+真空包装',
        },
      ],
      totalAmount: 147.6,
    })

    expect(fields.sellerName).toBe('宁波测试供应商')
    expect(fields.contractNo).toBe('CG20260210001')
    expect(fields.signDate).toBe('2026年1月4日')
    expect(fields.requiredDeliveryDate).toBe('2026/03/05')
    expect(fields.quantity).toBe('120')
    expect(fields.unitPrice).toBe('¥1.230')
    expect(fields.amount).toBe('¥147.60')
    expect(fields.totalAmount).toBe('¥147.60')
    expect(fields.innerPackaging).toBe('八孔泡沫箱+真空包装')
    expect(fields.deliveryAddress).toBe('杭州临平仓')
    expect(fields.otherRequirement).toBe('请按图纸执行')
  })
})
