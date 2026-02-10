import { describe, expect, it } from 'vitest'
import { __TEST_ONLY__, uploadTemplateFile } from './printTemplates'

const { buildTemplateHTMLFromResponse } = __TEST_ONLY__

const toArrayBuffer = (text) => new TextEncoder().encode(text).buffer

describe('printTemplates', () => {
  it('billingInfo 遇到 PDF 时返回固定版式模板', () => {
    const pdfHeader = Uint8Array.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x33]).buffer
    const html = buildTemplateHTMLFromResponse('billingInfo', pdfHeader, 'application/pdf')
    expect(html).toContain('billing-info-template')
    expect(html).toContain('<svg')
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
})
