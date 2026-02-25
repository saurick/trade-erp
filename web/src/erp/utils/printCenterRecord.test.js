import { describe, expect, it } from 'vitest'
import { hasPrintableRecord, pickPrintableRecord } from './printCenterRecord'

describe('printCenterRecord', () => {
  it('pickPrintableRecord 会返回第一条可用对象记录', () => {
    const record = pickPrintableRecord([null, undefined, { id: 0, name: 'A' }])
    expect(record).toEqual({ id: 0, name: 'A' })
  })

  it('pickPrintableRecord 在无可用记录时返回空对象', () => {
    expect(pickPrintableRecord([])).toEqual({})
    expect(pickPrintableRecord(null)).toEqual({})
  })

  it('hasPrintableRecord 不再强依赖 id 字段', () => {
    expect(hasPrintableRecord([{ name: '杭州科森磁材有限公司' }])).toBe(true)
  })

  it('hasPrintableRecord 仅有空对象时返回 false', () => {
    expect(hasPrintableRecord([{}])).toBe(false)
  })
})
