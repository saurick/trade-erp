import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
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
  const [moduleLoadingMap, setModuleLoadingMap] = useState({})
  const [moduleLoadedMap, setModuleLoadedMap] = useState({})
  const inflightMapRef = useRef(new Map())
  const moduleRecordsRef = useRef({})
  const moduleLoadedMapRef = useRef({})

  const erpRpc = useMemo(
    () => new JsonRpc({ url: 'erp', authScope: AUTH_SCOPE.ADMIN }),
    []
  )

  const getModuleRecords = useCallback(
    (moduleKey) => moduleRecords[moduleKey] || [],
    [moduleRecords]
  )

  useEffect(() => {
    moduleRecordsRef.current = moduleRecords
  }, [moduleRecords])

  useEffect(() => {
    moduleLoadedMapRef.current = moduleLoadedMap
  }, [moduleLoadedMap])

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

  const setModuleLoading = useCallback((moduleKey, loading) => {
    setModuleLoadingMap((prev) => {
      const isLoading = Boolean(loading)
      const hasCurrent = Boolean(prev[moduleKey])
      if (isLoading === hasCurrent) {
        return prev
      }
      const next = { ...prev }
      if (isLoading) {
        next[moduleKey] = true
      } else {
        delete next[moduleKey]
      }
      return next
    })
  }, [])

  const ensureModuleLoaded = useCallback(
    async (moduleKey, options = {}) => {
      const key = String(moduleKey || '').trim()
      if (!key) {
        return []
      }

      const force = Boolean(options.force)
      if (!force && moduleLoadedMapRef.current[key]) {
        return moduleRecordsRef.current[key] || []
      }

      if (!force) {
        const inflight = inflightMapRef.current.get(key)
        if (inflight) {
          return inflight
        }
      }

      const task = (async () => {
        setModuleLoading(key, true)
        try {
          const records = await fetchModuleList(key)
          setModuleRecords((prev) => ({
            ...prev,
            [key]: records,
          }))
          setModuleLoadedMap((prev) => ({
            ...prev,
            [key]: true,
          }))
          return records
        } finally {
          setModuleLoading(key, false)
          if (inflightMapRef.current.get(key) === task) {
            inflightMapRef.current.delete(key)
          }
        }
      })()

      inflightMapRef.current.set(key, task)
      return task
    },
    [fetchModuleList, setModuleLoading]
  )

  const ensureModulesLoaded = useCallback(
    async (moduleKeys, options = {}) => {
      const uniqueKeys = Array.from(new Set((moduleKeys || []).filter(Boolean)))
      if (uniqueKeys.length === 0) {
        return {}
      }

      const settled = await Promise.allSettled(
        uniqueKeys.map((key) => ensureModuleLoaded(key, options))
      )

      const firstError = settled.find((item) => item.status === 'rejected')
      if (firstError?.status === 'rejected') {
        throw firstError.reason
      }

      return uniqueKeys.reduce((acc, key, idx) => {
        const result = settled[idx]
        acc[key] = result.status === 'fulfilled' ? result.value : []
        return acc
      }, {})
    },
    [ensureModuleLoaded]
  )

  const reloadAllModules = useCallback(async () => {
    try {
      await ensureModulesLoaded(
        moduleDefinitions.map((moduleItem) => moduleItem.key),
        { force: true }
      )
    } catch (err) {
      if ([10005, 10006, 40302].includes(Number(err?.code))) {
        return
      }
      message.error(err?.message || '加载 ERP 数据失败')
    }
  }, [ensureModulesLoaded])

  const routePrefetchMap = useMemo(() => {
    const map = {}
    moduleDefinitions.forEach((moduleItem) => {
      const refModules = Array.from(
        new Set(
          (moduleItem.formFields || [])
            .filter((field) => field?.type === 'select-ref' && field.refModule)
            .map((field) => field.refModule)
        )
      )
      map[moduleItem.path] = Array.from(new Set([moduleItem.key, ...refModules]))
    })

    map['/dashboard'] = moduleDefinitions.map((moduleItem) => moduleItem.key)
    map['/docs/print-center'] = ['exportSales', 'purchaseContracts', 'partners']
    return map
  }, [])

  useEffect(() => {
    const isAdminLoginPage = location.pathname === '/admin-login'
    const hasAdminToken = Boolean(getToken(AUTH_SCOPE.ADMIN))
    if (isAdminLoginPage || !hasAdminToken) {
      setModuleRecords({})
      setModuleLoadedMap({})
      setModuleLoadingMap({})
      inflightMapRef.current.clear()
      return
    }

    const needModules = routePrefetchMap[location.pathname] || []
    if (needModules.length === 0) {
      return
    }

    void (async () => {
      try {
        await ensureModulesLoaded(needModules)
      } catch (err) {
        if ([10005, 10006, 40302].includes(Number(err?.code))) {
          return
        }
        message.error(err?.message || '加载 ERP 数据失败')
      }
    })()
  }, [ensureModulesLoaded, location.pathname, routePrefetchMap])

  const loading = useMemo(
    () => Object.values(moduleLoadingMap).some(Boolean),
    [moduleLoadingMap]
  )

  const isModuleLoading = useCallback(
    (moduleKey) => Boolean(moduleLoadingMap[moduleKey]),
    [moduleLoadingMap]
  )

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
      let currentList = getModuleRecords(moduleItem.key)
      if (!moduleLoadedMapRef.current[moduleItem.key]) {
        currentList = await ensureModuleLoaded(moduleItem.key)
      }
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
    [applyModuleUpdate, createRemoteRecord, ensureModuleLoaded, getModuleRecords]
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
      const records = await ensureModuleLoaded('inventory')
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
    [addRecord, ensureModuleLoaded, updateRecord]
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
      isModuleLoading,
      moduleRecords,
      getModuleRecords,
      reloadAllModules,
      ensureModuleLoaded,
      ensureModulesLoaded,
      addRecord,
      updateRecord,
      deleteRecord,
      moveStatus,
      createLinkedRecord,
      receiveInbound,
    }),
    [
      loading,
      isModuleLoading,
      moduleRecords,
      getModuleRecords,
      reloadAllModules,
      ensureModuleLoaded,
      ensureModulesLoaded,
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
