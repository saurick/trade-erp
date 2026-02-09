import React from 'react'
import { Empty } from 'antd'
import { useParams } from 'react-router-dom'
import ModuleTablePage from '../components/ModuleTablePage'
import { moduleMap } from '../config/moduleDefinitions'

const ModulePage = () => {
  const { moduleKey } = useParams()
  const moduleItem = moduleMap[moduleKey]

  if (!moduleItem) {
    return <Empty description="模块不存在" />
  }

  return <ModuleTablePage moduleItem={moduleItem} />
}

export default ModulePage
