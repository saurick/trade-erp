import { BOX_TRANSITIONS } from '../constants/workflow'

export const canTransitStatus = (from, to, transitions = BOX_TRANSITIONS) => {
  const nextList = transitions[from] || []
  return nextList.includes(to)
}

export const getNextStatuses = (status, transitions = BOX_TRANSITIONS) =>
  transitions[status] || []
