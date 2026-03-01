import React, { useMemo, useState } from 'react'
import {
  Button,
  Card,
  Col,
  DatePicker,
  Dropdown,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Table,
  Typography,
  Upload,
  message,
} from 'antd'
import {
  DeleteOutlined,
  DownOutlined,
  EditOutlined,
  PlusOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import { AUTH_SCOPE, getToken } from '@/common/auth/auth'
import { BOX_STATUS } from '../constants/workflow'
import { getNextStatuses } from '../utils/workflow'
import { useERPData } from '../data/ERPDataContext'
import ItemsFormList from './ItemsFormList'
import StatusTag from './StatusTag'
import { summarizeItems } from '../utils/items'
import { openPrintWindow } from '../data/printTemplates'

const { Paragraph, Text, Title } = Typography

const uploadAttachment = async (file, category = 'attachments') => {
  const token = getToken(AUTH_SCOPE.ADMIN)
  if (!token) {
    throw new Error('请先登录管理员账号')
  }
  const formData = new FormData()
  formData.append('file', file)

  const resp = await fetch(
    `/files/upload?category=${encodeURIComponent(category)}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    }
  )
  const payload = await resp.json().catch(() => ({}))
  if (!resp.ok || Number(payload?.code) !== 0) {
    throw new Error(payload?.message || '附件上传失败')
  }
  return payload?.data?.url || ''
}

const UploadFieldInput = ({
  value,
  onChange,
  multiple = false,
  category = 'attachments',
}) => {
  const textValue = typeof value === 'string' ? value : ''

  const handleUpload = async ({ file, onSuccess, onError }) => {
    try {
      const fileURL = await uploadAttachment(file, category)
      const mergedValue = multiple
        ? [textValue, fileURL].filter(Boolean).join('\n')
        : fileURL
      onChange?.(mergedValue)
      message.success('附件上传成功')
      onSuccess?.({}, file)
    } catch (err) {
      message.error(err?.message || '附件上传失败')
      onError?.(err)
    }
  }

  return (
    <Space direction="vertical" style={{ width: '100%' }} size={8}>
      <Input.TextArea
        value={textValue}
        rows={3}
        maxLength={1000}
        showCount
        placeholder="可手动输入或上传文件后自动写入 URL"
        onChange={(event) => onChange?.(event.target.value)}
      />
      <Upload
        accept=".xls,.xlsx,.pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
        showUploadList={false}
        customRequest={handleUpload}
      >
        <Button size="small">上传附件</Button>
      </Upload>
    </Space>
  )
}

const openNativeDatePicker = (event) => {
  const target = event?.target
  if (typeof target?.showPicker !== 'function') {
    return
  }

  try {
    target.showPicker()
  } catch {
    // 部分浏览器会拦截 showPicker，失败时回退原生输入行为。
  }
}

const renderField = (field, options = {}) => {
  if (field.type === 'items') {
    return (
      <ItemsFormList
        name={field.name}
        label={field.label}
        fields={field.itemFields || []}
      />
    )
  }

  if (field.type === 'select-ref') {
    return <Select options={options.refOptions || []} />
  }

  if (field.type === 'select') {
    return <Select options={field.options || []} />
  }

  if (field.type === 'number') {
    return <InputNumber style={{ width: '100%' }} min={0} />
  }

  if (field.type === 'textarea') {
    return <Input.TextArea rows={3} maxLength={300} showCount />
  }

  if (field.type === 'upload') {
    return (
      <UploadFieldInput
        multiple={Boolean(field.multiple)}
        category={field.uploadCategory || 'attachments'}
      />
    )
  }

  if (field.type === 'date-picker') {
    return <DatePicker style={{ width: '100%' }} />
  }

  if (field.type === 'date') {
    return <Input type="date" onClick={openNativeDatePicker} />
  }

  return <Input />
}

const normalizeValues = (values) => {
  const normalized = {}

  Object.entries(values).forEach(([key, value]) => {
    if (
      value &&
      typeof value === 'object' &&
      typeof value.format === 'function'
    ) {
      normalized[key] = value.format('YYYY-MM-DD')
      return
    }
    normalized[key] = value
  })

  return normalized
}

const ModuleTablePage = ({ moduleItem }) => {
  const {
    isModuleLoading,
    moduleRecords,
    addRecord,
    updateRecord,
    deleteRecord,
    moveStatus,
    createLinkedRecord,
    receiveInbound,
    getModuleRecords,
  } = useERPData()
  const [form] = Form.useForm()
  const [modalVisible, setModalVisible] = useState(false)
  const [editingRecord, setEditingRecord] = useState(null)
  const [keyword, setKeyword] = useState('')
  const [boxFilter, setBoxFilter] = useState('')

  const records = moduleRecords[moduleItem.key] || []
  const tableLoading = isModuleLoading(moduleItem.key)

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      const keywordMatched = keyword.trim()
        ? JSON.stringify(record)
            .toLowerCase()
            .includes(keyword.trim().toLowerCase())
        : true
      const boxMatched = boxFilter ? record.box === boxFilter : true
      return keywordMatched && boxMatched
    })
  }, [boxFilter, keyword, records])

  const openCreateModal = () => {
    setEditingRecord(null)
    form.resetFields()
    form.setFieldValue('box', moduleItem.defaultStatus)
    setModalVisible(true)
  }

  const openEditModal = (record) => {
    setEditingRecord(record)
    form.setFieldsValue(record)
    setModalVisible(true)
  }

  const closeModal = () => {
    setModalVisible(false)
    setEditingRecord(null)
    form.resetFields()
  }

  const submitForm = async () => {
    try {
      const values = await form.validateFields()
      let payload = normalizeValues(values)

      if (typeof moduleItem.beforeSave === 'function') {
        payload = moduleItem.beforeSave(payload, { getModuleRecords })
      }

      if (editingRecord) {
        await updateRecord(moduleItem, editingRecord.id, payload)
        message.success('记录已更新')
      } else {
        await addRecord(moduleItem, payload)
        message.success('记录已新增')
      }

      closeModal()
    } catch (err) {
      // 统一兜底提示，避免提交异常以未捕获 Promise 形式抛到控制台。
      message.error(err?.message || '提交失败，请稍后重试')
    }
  }

  const columnDefs = useMemo(() => {
    const baseColumns = moduleItem.columns.map((col) => ({
      ...col,
      ellipsis: true,
      width: col.width || 180,
      render:
        col.renderType === 'items-summary'
          ? (items) => {
              const summary = summarizeItems(items || [])
              return `条目:${summary.count} 数量:${summary.totalQty} 金额:${summary.totalAmount}`
            }
          : col.render,
    }))

    baseColumns.push({
      title: '状态箱',
      dataIndex: 'box',
      width: 120,
      render: (status) => <StatusTag status={status} />,
    })

    baseColumns.push({
      title: '操作',
      dataIndex: 'operation',
      fixed: 'right',
      width: 260,
      render: (_, record) => {
        const transitions = moduleItem.transitions || null
        const nextStatuses = transitions
          ? getNextStatuses(record.box, transitions)
          : getNextStatuses(record.box)
        const statusMenuItems = nextStatuses.map((status) => ({
          key: status,
          label: status,
        }))

        const handleStatusClick = async ({ key }) => {
          try {
            await moveStatus(moduleItem, record.id, key)
            message.success(`已流转到 ${key}`)
          } catch (err) {
            message.error(err?.message || '状态流转失败')
          }
        }

        const runSafe = (runner, args = []) => {
          Promise.resolve(runner(...args)).catch((err) => {
            message.error(err?.message || '操作失败')
          })
        }

        const actionHelpers = {
          addRecord: (...args) => runSafe(addRecord, args),
          updateRecord: (...args) => runSafe(updateRecord, args),
          moveStatus: (...args) => runSafe(moveStatus, args),
          createLinkedRecord: (...args) => runSafe(createLinkedRecord, args),
          receiveInbound: (...args) => runSafe(receiveInbound, args),
          getModuleRecords,
          notify: message,
          openPrintWindow,
        }

        return (
          <Space>
            <Button
              icon={<EditOutlined />}
              size="small"
              onClick={() => openEditModal(record)}
            >
              编辑
            </Button>
            <Dropdown
              menu={{ items: statusMenuItems, onClick: handleStatusClick }}
              disabled={statusMenuItems.length === 0}
              trigger={['click']}
            >
              <Button size="small">
                流转 <DownOutlined />
              </Button>
            </Dropdown>
            {(moduleItem.rowActions || []).map((action) => (
              <Button
                key={action.key}
                size="small"
                type={action.type === 'primary' ? 'primary' : 'default'}
                onClick={() => {
                  Promise.resolve(
                    action.onRun(record, actionHelpers, moduleItem)
                  ).catch((err) => {
                    message.error(err?.message || '操作失败')
                  })
                }}
              >
                {action.label}
              </Button>
            ))}
            <Popconfirm
              title="确认删除该记录？"
              okText="删除"
              cancelText="取消"
              onConfirm={async () => {
                try {
                  await deleteRecord(moduleItem, record.id)
                  message.success('记录已删除')
                } catch (err) {
                  message.error(err?.message || '删除失败')
                }
              }}
            >
              <Button danger size="small" icon={<DeleteOutlined />}>
                删除
              </Button>
            </Popconfirm>
          </Space>
        )
      },
    })

    return baseColumns
  }, [
    moduleItem,
    addRecord,
    updateRecord,
    deleteRecord,
    moveStatus,
    createLinkedRecord,
    receiveInbound,
    getModuleRecords,
  ])

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card className="erp-page-card" variant="borderless">
        <Space direction="vertical" size={4}>
          <Title level={4} style={{ margin: 0 }}>
            {moduleItem.title}
          </Title>
          <Paragraph type="secondary" style={{ margin: 0 }}>
            {moduleItem.description}
          </Paragraph>
          <Text type="secondary">
            状态箱流程：草稿箱 → 待批箱 → 已批箱，或按场景直接免批/招领确认。
          </Text>
        </Space>
      </Card>

      <Card className="erp-page-card" variant="borderless">
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} sm={24} md={10} lg={8}>
            <Input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="按任意字段搜索"
              prefix={<SearchOutlined />}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={6} lg={5}>
            <Select
              style={{ width: '100%' }}
              placeholder="按状态箱筛选"
              allowClear
              value={boxFilter || undefined}
              onChange={(value) => setBoxFilter(value || '')}
              options={Object.values(BOX_STATUS).map((box) => ({
                label: box,
                value: box,
              }))}
            />
          </Col>
          <Col xs={24} sm={12} md={8} lg={11} style={{ textAlign: 'right' }}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={openCreateModal}
            >
              新建记录
            </Button>
          </Col>
        </Row>
      </Card>

      <Card className="erp-page-card" variant="borderless">
        <Table
          rowKey="id"
          size="middle"
          loading={tableLoading}
          pagination={{ pageSize: 8 }}
          locale={{ emptyText: <Empty description="暂无数据" /> }}
          columns={columnDefs}
          dataSource={filteredRecords}
          scroll={{ x: 'max-content' }}
        />
      </Card>

      <Modal
        title={
          editingRecord
            ? `编辑：${moduleItem.title}`
            : `新建：${moduleItem.title}`
        }
        open={modalVisible}
        onCancel={closeModal}
        onOk={submitForm}
        width={720}
        destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            box: moduleItem.defaultStatus,
            ...(moduleItem.defaultValues || {}),
          }}
        >
          <Row gutter={12}>
            {moduleItem.formFields.map((field) => {
              if (field.type === 'items') {
                return (
                  <Col span={24} key={field.name}>
                    {renderField(field)}
                  </Col>
                )
              }

              if (field.type === 'section') {
                return (
                  <Col span={24} key={field.name}>
                    <Title level={5} style={{ marginTop: 4, marginBottom: 0 }}>
                      {field.label}
                    </Title>
                  </Col>
                )
              }

              let refOptions = null
              if (field.type === 'select-ref') {
                const list = getModuleRecords(field.refModule).filter(
                  (record) => (field.filter ? field.filter(record) : true)
                )
                refOptions = list.map((record) => ({
                  label:
                    record[field.labelKey || 'name'] ||
                    record.name ||
                    record.code,
                  value:
                    record[field.valueKey || 'name'] ||
                    record.name ||
                    record.code,
                }))
              }

              return (
                <Col
                  span={field.span || (field.type === 'textarea' ? 24 : 12)}
                  key={field.name}
                >
                  <Form.Item
                    name={field.name}
                    label={field.label}
                    rules={
                      field.required
                        ? [{ required: true, message: `请输入${field.label}` }]
                        : []
                    }
                  >
                    {renderField(field, { refOptions })}
                  </Form.Item>
                </Col>
              )
            })}
            <Col span={12}>
              <Form.Item name="box" label="状态箱">
                <Select
                  options={Object.values(BOX_STATUS).map((box) => ({
                    label: box,
                    value: box,
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </Space>
  )
}

export default ModuleTablePage
