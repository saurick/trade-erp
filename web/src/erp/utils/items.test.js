import { describe, expect, it } from 'vitest'
import { calcItemsQty, calcItemsTotal, summarizeItems } from './items'

describe('items utils', () => {
  it('计算数量与金额', () => {
    const items = [
      { quantity: 2, unitPrice: 10 },
      { quantity: 3, unitPrice: 5.5 },
    ]
    expect(calcItemsQty(items)).toBe(5)
    expect(calcItemsTotal(items)).toBe(2 * 10 + 3 * 5.5)
  })

  it('汇总统计', () => {
    const items = [
      { quantity: 1, unitPrice: 8 },
      { quantity: 0, unitPrice: 9 },
    ]
    const summary = summarizeItems(items)
    expect(summary.count).toBe(2)
    expect(summary.totalQty).toBe(1)
    expect(summary.totalAmount).toBe(8)
  })
})
