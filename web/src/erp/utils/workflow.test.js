import { describe, expect, it } from 'vitest'
import { BOX_STATUS } from '../constants/workflow'
import { canTransitStatus, getNextStatuses } from './workflow'

describe('workflow utils', () => {
  it('草稿箱可以流转到待批箱', () => {
    expect(canTransitStatus(BOX_STATUS.DRAFT, BOX_STATUS.PENDING)).toBe(true)
  })

  it('已批箱不能直接退回草稿箱', () => {
    expect(canTransitStatus(BOX_STATUS.APPROVED, BOX_STATUS.DRAFT)).toBe(false)
  })

  it('招领箱只能流转到确认箱', () => {
    expect(getNextStatuses(BOX_STATUS.CLAIM)).toEqual([BOX_STATUS.CONFIRMED])
  })
})
