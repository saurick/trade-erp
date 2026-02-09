import { BOX_TRANSITIONS } from '../constants/workflow'

export const canTransitStatus = (from, to) => {
  const nextList = BOX_TRANSITIONS[from] || []
  return nextList.includes(to)
}

export const getNextStatuses = (status) => BOX_TRANSITIONS[status] || []
