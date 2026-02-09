import React from 'react'
import { Tag } from 'antd'
import { BOX_COLORS } from '../constants/workflow'

const StatusTag = ({ status }) => {
  if (!status) {
    return <Tag>未定义</Tag>
  }

  return <Tag color={BOX_COLORS[status]}>{status}</Tag>
}

export default StatusTag
