import { describe, expect, it } from 'vitest'
import { calcReceivableDate, createAutoCode } from './finance'

describe('finance utils', () => {
  it('根据付款周期自动计算应收日期', () => {
    expect(calcReceivableDate('2026-02-09', 45)).toBe('2026-03-26')
  })

  it('自动编码包含前缀与流水号', () => {
    const code = createAutoCode('QT', 3, new Date('2026-02-09T00:00:00'))
    expect(code).toBe('QT-20260209-0004')
  })
})
