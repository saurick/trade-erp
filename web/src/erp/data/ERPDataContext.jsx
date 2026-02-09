import React, { createContext, useContext, useMemo, useState } from 'react'
import { createAutoCode } from '../utils/finance'
import { createInitialModuleData } from './seedFactory'

const ERPDataContext = createContext(null)

export const ERPDataProvider = ({ children }) => {
  const [moduleRecords, setModuleRecords] = useState(createInitialModuleData)

  const addRecord = (moduleItem, values) => {
    setModuleRecords((prev) => {
      const currentList = prev[moduleItem.key] || []
      const code = values.code || createAutoCode(moduleItem.codePrefix, currentList.length)
      const record = {
        id: `${moduleItem.key}-${Date.now()}`,
        code,
        box: values.box || moduleItem.defaultStatus,
        ...values,
      }

      return {
        ...prev,
        [moduleItem.key]: [record, ...currentList],
      }
    })
  }

  const updateRecord = (moduleItem, recordId, values) => {
    setModuleRecords((prev) => {
      const currentList = prev[moduleItem.key] || []
      const nextList = currentList.map((record) =>
        record.id === recordId
          ? {
              ...record,
              ...values,
            }
          : record
      )

      return {
        ...prev,
        [moduleItem.key]: nextList,
      }
    })
  }

  const moveStatus = (moduleItem, recordId, nextStatus) => {
    setModuleRecords((prev) => {
      const currentList = prev[moduleItem.key] || []
      const nextList = currentList.map((record) =>
        record.id === recordId
          ? {
              ...record,
              box: nextStatus,
            }
          : record
      )

      return {
        ...prev,
        [moduleItem.key]: nextList,
      }
    })
  }

  const value = useMemo(
    () => ({
      moduleRecords,
      addRecord,
      updateRecord,
      moveStatus,
    }),
    [moduleRecords]
  )

  return <ERPDataContext.Provider value={value}>{children}</ERPDataContext.Provider>
}

export const useERPData = () => {
  const context = useContext(ERPDataContext)
  if (!context) {
    throw new Error('useERPData 必须在 ERPDataProvider 内使用')
  }
  return context
}
