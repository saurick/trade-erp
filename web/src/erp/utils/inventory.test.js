import { describe, expect, it } from 'vitest'
import { applyInventoryDelta } from './inventory'

describe('inventory utils', () => {
  it('新增库存记录', () => {
    const result = applyInventoryDelta({
      records: [],
      productName: 'A',
      warehouseName: '主仓',
      location: 'A-01',
      deltaQty: 10,
    })
    expect(result.records.length).toBe(1)
    expect(result.records[0].availableQty).toBe(10)
  })

  it('更新已有库存记录', () => {
    const result = applyInventoryDelta({
      records: [
        {
          id: 'inv-1',
          code: 'KC-001',
          productName: 'A',
          warehouseName: '主仓',
          location: 'A-01',
          availableQty: 5,
          lockedQty: 0,
        },
      ],
      productName: 'A',
      warehouseName: '主仓',
      location: 'A-01',
      deltaQty: -2,
    })
    expect(result.records[0].availableQty).toBe(3)
  })
})
