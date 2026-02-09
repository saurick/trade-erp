import React, { createContext, useContext, useMemo, useState } from 'react'
import { moduleMap } from '../config/moduleDefinitions'
import { createAutoCode } from '../utils/finance'
import { applyInventoryDelta } from '../utils/inventory'
import { createInitialModuleData } from './seedFactory'

const ERPDataContext = createContext(null)

export const ERPDataProvider = ({ children }) => {
  const [moduleRecords, setModuleRecords] = useState(createInitialModuleData)

  const getModuleRecords = (moduleKey) => moduleRecords[moduleKey] || []

  const buildCode = (moduleItem, values, currentList) => {
    if (typeof moduleItem.codeBuilder === 'function') {
      return moduleItem.codeBuilder(values, {
        currentSize: currentList.length,
        createAutoCode,
      })
    }

    return createAutoCode(moduleItem.codePrefix, currentList.length)
  }

  const applyModuleUpdate = (moduleKey, updater) => {
    setModuleRecords((prev) => {
      const currentList = prev[moduleKey] || []
      const nextList = updater(currentList)
      return {
        ...prev,
        [moduleKey]: nextList,
      }
    })
  }

  const addRecord = (moduleItem, values, options = {}) => {
    applyModuleUpdate(moduleItem.key, (currentList) => {
      const code = values.code || buildCode(moduleItem, values, currentList)
      const record = {
        id: `${moduleItem.key}-${Date.now()}`,
        code,
        box: values.box || moduleItem.defaultStatus,
        ...values,
      }

      return [record, ...currentList]
    })

    if (options.inventoryDelta) {
      applyModuleUpdate('inventory', (inventoryRecords) => {
        const { records } = applyInventoryDelta({
          records: inventoryRecords,
          ...options.inventoryDelta,
        })
        return records
      })
    }
  }

  const updateRecord = (moduleItem, recordId, values) => {
    applyModuleUpdate(moduleItem.key, (currentList) =>
      currentList.map((record) =>
        record.id === recordId
          ? {
              ...record,
              ...values,
            }
          : record
      )
    )
  }

  const moveStatus = (moduleItem, recordId, nextStatus) => {
    updateRecord(moduleItem, recordId, { box: nextStatus })
  }

  const createLinkedRecord = (targetKey, sourceRecord, mapFn, options = {}) => {
    const targetModule = moduleMap[targetKey]
    if (!targetModule) {
      return
    }

    const helpers = {
      getModuleRecords,
    }

    let values = mapFn ? mapFn(sourceRecord, helpers) : {}
    if (typeof targetModule.beforeSave === 'function') {
      values = targetModule.beforeSave(values, helpers)
    }
    addRecord(targetModule, values, options)
  }

  const receiveInbound = (record) => {
    if (!record) {
      return
    }

    if (!record.entryNo) {
      applyModuleUpdate('inbound', (currentList) =>
        currentList.map((item) => {
          if (item.id !== record.id) {
            return item
          }
          const entryNo = createAutoCode('RKD', currentList.length)
          return {
            ...item,
            entryNo,
            inboundApplied: true,
          }
        })
      )
    }

    if (!record.inboundApplied && record.productName && record.warehouseName && record.location && record.quantity) {
      applyModuleUpdate('inventory', (inventoryRecords) => {
        const { records } = applyInventoryDelta({
          records: inventoryRecords,
          productName: record.productName,
          warehouseName: record.warehouseName,
          location: record.location,
          deltaQty: Number(record.quantity),
        })
        return records
      })
    }
  }

  const value = useMemo(
    () => ({
      moduleRecords,
      getModuleRecords,
      addRecord,
      updateRecord,
      moveStatus,
      createLinkedRecord,
      receiveInbound,
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
