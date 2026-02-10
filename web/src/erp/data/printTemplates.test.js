import { describe, expect, it } from 'vitest'
import { __TEST_ONLY__, uploadTemplateFile } from './printTemplates'

const { buildTemplateHTMLFromResponse, buildBillingInfoFields } = __TEST_ONLY__

const toArrayBuffer = (text) => new TextEncoder().encode(text).buffer

describe('printTemplates', () => {
  it('billingInfo 遇到 PDF 时返回固定版式模板', () => {
    const pdfHeader = Uint8Array.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x33]).buffer
    const html = buildTemplateHTMLFromResponse('billingInfo', pdfHeader, 'application/pdf')
    expect(html).toContain('billing-info-template')
    expect(html).toContain('billing-info-canvas')
    expect(html).toContain('/templates/billing-info-logo.png')
    expect(html).toContain('/templates/billing-info-stamp.png')
  })

  it('非 billingInfo 遇到 PDF 时抛出错误', () => {
    const pdfHeader = Uint8Array.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x33]).buffer
    expect(() => buildTemplateHTMLFromResponse('invoice', pdfHeader, 'application/pdf')).toThrow(
      '当前模板是 PDF'
    )
  })

  it('HTML 模板会自动给单元格加可编辑属性', () => {
    const rawHTML = '<!doctype html><html><body><table><tbody><tr><td>1</td></tr></tbody></table></body></html>'
    const html = buildTemplateHTMLFromResponse('invoice', toArrayBuffer(rawHTML), 'text/html')
    expect(html).toContain('<td contenteditable="true" spellcheck="false">1</td>')
  })

  it('billingInfo 不支持上传覆盖', async () => {
    await expect(uploadTemplateFile('billingInfo', new Blob(['test']))).rejects.toThrow(
      '开票信息模板为固定版式，不支持上传覆盖'
    )
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
})
