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
  Row,
  Select,
  Space,
  Table,
  Typography,
  message,
} from 'antd'
import { DownOutlined, EditOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons'
import { BOX_STATUS } from '../constants/workflow'
import { getNextStatuses } from '../utils/workflow'
import { useERPData } from '../data/ERPDataContext'
import ItemsFormList from './ItemsFormList'
import StatusTag from './StatusTag'
import { summarizeItems } from '../utils/items'
import { openPrintWindow } from '../data/printTemplates'

const { Paragraph, Text, Title } = Typography

const renderField = (field, options = {}) => {
  if (field.type === 'items') {
    return <ItemsFormList name={field.name} label={field.label} fields={field.itemFields || []} />
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

  if (field.type === 'date-picker') {
    return <DatePicker style={{ width: '100%' }} />
  }

  if (field.type === 'date') {
    return <Input type="date" />
  }

  return <Input />
}

const normalizeValues = (values) => {
  const normalized = {}

  Object.entries(values).forEach(([key, value]) => {
    if (value && typeof value === 'object' && typeof value.format === 'function') {
      normalized[key] = value.format('YYYY-MM-DD')
      return
    }
    normalized[key] = value
  })

  return normalized
}

const ModuleTablePage = ({ moduleItem }) => {
  const {
    moduleRecords,
    addRecord,
    updateRecord,
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

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      const keywordMatched = keyword.trim()
        ? JSON.stringify(record).toLowerCase().includes(keyword.trim().toLowerCase())
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
    const values = await form.validateFields()
    let payload = normalizeValues(values)

    if (typeof moduleItem.beforeSave === 'function') {
      payload = moduleItem.beforeSave(payload, { getModuleRecords })
    }

    if (editingRecord) {
      updateRecord(moduleItem, editingRecord.id, payload)
      message.success('记录已更新')
    } else {
      addRecord(moduleItem, payload)
      message.success('记录已新增')
    }

    closeModal()
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
        const nextStatuses = transitions ? getNextStatuses(record.box, transitions) : getNextStatuses(record.box)
        const statusMenuItems = nextStatuses.map((status) => ({
          key: status,
          label: status,
        }))

        const handleStatusClick = ({ key }) => {
          moveStatus(moduleItem, record.id, key)
          message.success(`已流转到 ${key}`)
        }

        const actionHelpers = {
          addRecord,
          updateRecord,
          moveStatus,
          createLinkedRecord,
          receiveInbound,
          getModuleRecords,
          notify: message,
          openPrintWindow,
        }

        return (
          <Space>
            <Button icon={<EditOutlined />} size="small" onClick={() => openEditModal(record)}>
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
                onClick={() => action.onRun(record, actionHelpers, moduleItem)}
              >
                {action.label}
              </Button>
            ))}
          </Space>
        )
      },
    })

    return baseColumns
  }, [moduleItem, moveStatus])

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card className="erp-page-card" bordered={false}>
        <Space direction="vertical" size={4}>
          <Title level={4} style={{ margin: 0 }}>
            {moduleItem.title}
          </Title>
          <Paragraph type="secondary" style={{ margin: 0 }}>
            {moduleItem.description}
          </Paragraph>
          <Text type="secondary">状态箱流程：草稿箱 → 待批箱 → 已批箱，或按场景直接免批/招领确认。</Text>
        </Space>
      </Card>

      <Card className="erp-page-card" bordered={false}>
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
              options={Object.values(BOX_STATUS).map((box) => ({ label: box, value: box }))}
            />
          </Col>
          <Col xs={24} sm={12} md={8} lg={11} style={{ textAlign: 'right' }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
              新建记录
            </Button>
          </Col>
        </Row>
      </Card>

      <Card className="erp-page-card" bordered={false}>
        <Table
          rowKey="id"
          size="middle"
          pagination={{ pageSize: 8 }}
          locale={{ emptyText: <Empty description="暂无数据" /> }}
          columns={columnDefs}
          dataSource={filteredRecords}
          scroll={{ x: 'max-content' }}
        />
      </Card>

      <Modal
        title={editingRecord ? `编辑：${moduleItem.title}` : `新建：${moduleItem.title}`}
        open={modalVisible}
        onCancel={closeModal}
        onOk={submitForm}
        width={720}
        destroyOnClose
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
                const list = getModuleRecords(field.refModule).filter((record) =>
                  field.filter ? field.filter(record) : true
                )
                refOptions = list.map((record) => ({
                  label: record[field.labelKey || 'name'] || record.name || record.code,
                  value: record[field.valueKey || 'name'] || record.name || record.code,
                }))
              }

              return (
                <Col span={field.span || (field.type === 'textarea' ? 24 : 12)} key={field.name}>
                  <Form.Item
                    name={field.name}
                    label={field.label}
                    rules={field.required ? [{ required: true, message: `请输入${field.label}` }] : []}
                  >
                    {renderField(field, { refOptions })}
                  </Form.Item>
                </Col>
              )
            })}
            <Col span={12}>
              <Form.Item name="box" label="状态箱">
                <Select options={Object.values(BOX_STATUS).map((box) => ({ label: box, value: box }))} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </Space>
  )
}

export default ModuleTablePage
