import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { message } from 'antd'
import { useLocation } from 'react-router-dom'
import { JsonRpc } from '@/common/utils/jsonRpc'
import { AUTH_SCOPE, getToken } from '@/common/auth/auth'
import { moduleDefinitions, moduleMap } from '../config/moduleDefinitions'
import { createAutoCode } from '../utils/finance'

const ERPDataContext = createContext(null)

const toRecordID = (value) => {
  const parsed = Number(value)
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed
  }
  return 0
}

export const ERPDataProvider = ({ children }) => {
  const location = useLocation()
  const [moduleRecords, setModuleRecords] = useState({})
  const [loading, setLoading] = useState(true)

  const erpRpc = useMemo(
    () => new JsonRpc({ url: 'erp', authScope: AUTH_SCOPE.ADMIN }),
    []
  )

  const getModuleRecords = useCallback(
    (moduleKey) => moduleRecords[moduleKey] || [],
    [moduleRecords]
  )

  const applyModuleUpdate = useCallback((moduleKey, updater) => {
    setModuleRecords((prev) => {
      const currentList = prev[moduleKey] || []
      const nextList = updater(currentList)
      return {
        ...prev,
        [moduleKey]: nextList,
      }
    })
  }, [])

  const fetchModuleList = useCallback(
    async (moduleKey) => {
      const res = await erpRpc.call('list', { module_key: moduleKey })
      const records = res?.data?.records
      return Array.isArray(records) ? records : []
    },
    [erpRpc]
  )

  const reloadAllModules = useCallback(async () => {
    setLoading(true)
    try {
      const moduleEntries = await Promise.all(
        moduleDefinitions.map(async (moduleItem) => {
          const records = await fetchModuleList(moduleItem.key)
          return [moduleItem.key, records]
        })
      )
      setModuleRecords(Object.fromEntries(moduleEntries))
    } catch (err) {
      if ([10005, 10006, 40302].includes(Number(err?.code))) {
        return
      }
      message.error(err?.message || '加载 ERP 数据失败')
    } finally {
      setLoading(false)
    }
  }, [fetchModuleList])

  useEffect(() => {
    const isAdminLoginPage = location.pathname === '/admin-login'
    const hasAdminToken = Boolean(getToken(AUTH_SCOPE.ADMIN))
    if (isAdminLoginPage || !hasAdminToken) {
      setModuleRecords({})
      setLoading(false)
      return
    }
    void reloadAllModules()
  }, [location.pathname, reloadAllModules])

  const buildCode = (moduleItem, values, currentList) => {
    if (typeof moduleItem.codeBuilder === 'function') {
      return moduleItem.codeBuilder(values, {
        currentSize: currentList.length,
        createAutoCode,
      })
    }
    return createAutoCode(moduleItem.codePrefix, currentList.length)
  }

  const createRemoteRecord = useCallback(
    async (moduleKey, record) => {
      const result = await erpRpc.call('create', {
        module_key: moduleKey,
        record,
      })
      return result?.data?.record || record
    },
    [erpRpc]
  )

  const updateRemoteRecord = useCallback(
    async (moduleKey, recordID, record) => {
      const result = await erpRpc.call('update', {
        module_key: moduleKey,
        id: recordID,
        record,
      })
      return result?.data?.record || record
    },
    [erpRpc]
  )

  const addRecord = useCallback(
    async (moduleItem, values) => {
      const currentList = getModuleRecords(moduleItem.key)
      const code = values.code || buildCode(moduleItem, values, currentList)
      const record = {
        code,
        box: values.box || moduleItem.defaultStatus,
        ...values,
      }

      const created = await createRemoteRecord(moduleItem.key, record)
      applyModuleUpdate(moduleItem.key, (list) => [created, ...list])
      return created
    },
    [applyModuleUpdate, createRemoteRecord, getModuleRecords]
  )

  const updateRecord = useCallback(
    async (moduleItem, recordId, values) => {
      const currentList = getModuleRecords(moduleItem.key)
      const target = currentList.find((item) => String(item.id) === String(recordId))
      if (!target) {
        throw new Error('记录不存在或已被删除')
      }

      const merged = {
        ...target,
        ...values,
      }

      const recordID = toRecordID(recordId)
      if (recordID <= 0) {
        throw new Error('记录 ID 非法')
      }

      const updated = await updateRemoteRecord(moduleItem.key, recordID, merged)
      applyModuleUpdate(moduleItem.key, (list) =>
        list.map((item) => (String(item.id) === String(recordId) ? updated : item))
      )
      return updated
    },
    [applyModuleUpdate, getModuleRecords, updateRemoteRecord]
  )

  const deleteRecord = useCallback(
    async (moduleItem, recordId) => {
      const recordID = toRecordID(recordId)
      if (recordID <= 0) {
        throw new Error('记录 ID 非法')
      }

      await erpRpc.call('delete', {
        module_key: moduleItem.key,
        id: recordID,
      })

      applyModuleUpdate(moduleItem.key, (list) =>
        list.filter((item) => String(item.id) !== String(recordId))
      )
    },
    [applyModuleUpdate, erpRpc]
  )

  const moveStatus = useCallback(
    async (moduleItem, recordId, nextStatus) => {
      return updateRecord(moduleItem, recordId, { box: nextStatus })
    },
    [updateRecord]
  )

  const applyInventoryDeltaRemote = useCallback(
    async ({ productName, warehouseName, location, deltaQty }) => {
      if (!productName || !warehouseName || !location || !deltaQty) {
        return null
      }

      const inventoryModule = moduleMap.inventory
      const records = getModuleRecords('inventory')
      const current = records.find(
        (item) =>
          item.productName === productName &&
          item.warehouseName === warehouseName &&
          item.location === location
      )

      if (current) {
        const nextQty = Number(current.availableQty || 0) + Number(deltaQty || 0)
        await updateRecord(inventoryModule, current.id, { availableQty: nextQty })
        return null
      }

      await addRecord(inventoryModule, {
        productName,
        warehouseName,
        location,
        availableQty: Number(deltaQty),
        lockedQty: 0,
      })
      return null
    },
    [addRecord, getModuleRecords, updateRecord]
  )

  const createLinkedRecord = useCallback(
    async (targetKey, sourceRecord, mapFn, options = {}) => {
      const targetModule = moduleMap[targetKey]
      if (!targetModule) {
        throw new Error(`目标模块不存在: ${targetKey}`)
      }

      const helpers = {
        getModuleRecords,
      }

      let values = mapFn ? mapFn(sourceRecord, helpers) : {}
      if (typeof targetModule.beforeSave === 'function') {
        values = targetModule.beforeSave(values, helpers)
      }

      const created = await addRecord(targetModule, values)

      if (options.inventoryDelta) {
        await applyInventoryDeltaRemote(options.inventoryDelta)
      }

      return created
    },
    [addRecord, applyInventoryDeltaRemote, getModuleRecords]
  )

  const receiveInbound = useCallback(
    async (record) => {
      if (!record) {
        return
      }

      const inboundModule = moduleMap.inbound
      const shouldApplyDelta =
        !record.inboundApplied &&
        record.productName &&
        record.warehouseName &&
        record.location &&
        record.quantity

      if (!record.entryNo) {
        const entryNo = createAutoCode('RKD', getModuleRecords('inbound').length)
        await updateRecord(inboundModule, record.id, {
          entryNo,
        })
      }

      if (shouldApplyDelta) {
        await applyInventoryDeltaRemote({
          productName: record.productName,
          warehouseName: record.warehouseName,
          location: record.location,
          deltaQty: Number(record.quantity),
        })
        await updateRecord(inboundModule, record.id, {
          inboundApplied: true,
        })
      }
    },
    [applyInventoryDeltaRemote, getModuleRecords, updateRecord]
  )

  const value = useMemo(
    () => ({
      loading,
      moduleRecords,
      getModuleRecords,
      reloadAllModules,
      addRecord,
      updateRecord,
      deleteRecord,
      moveStatus,
      createLinkedRecord,
      receiveInbound,
    }),
    [
      loading,
      moduleRecords,
      getModuleRecords,
      reloadAllModules,
      addRecord,
      updateRecord,
      deleteRecord,
      moveStatus,
      createLinkedRecord,
      receiveInbound,
    ]
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
