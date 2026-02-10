import React, { useCallback, useMemo, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Empty,
  Modal,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd'
import { JsonRpc } from '@/common/utils/jsonRpc'
import { AUTH_SCOPE } from '@/common/auth/auth'
import {
  ERP_MENU_PERMISSION_OPTIONS,
  defaultMenuPermissions,
  getPermissionLabel,
  normalizeMenuPermissions,
} from '../config/menuPermissions'

const { Paragraph, Text, Title } = Typography

const levelTextMap = {
  0: '超级管理员',
  1: '一级管理员',
  2: '二级管理员',
}

const PermissionCenterPage = () => {
  const adminRpc = useMemo(() => new JsonRpc({ url: 'admin', authScope: AUTH_SCOPE.ADMIN }), [])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [currentAdmin, setCurrentAdmin] = useState(null)
  const [admins, setAdmins] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editingAdmin, setEditingAdmin] = useState(null)
  const [selectedPermissions, setSelectedPermissions] = useState([])

  const isSuperAdmin = currentAdmin?.level === 0

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [meResult, listResult] = await Promise.all([
        adminRpc.call('me', {}),
        adminRpc.call('list', {}),
      ])

      setCurrentAdmin(meResult?.data || null)
      setAdmins(Array.isArray(listResult?.data?.admins) ? listResult.data.admins : [])
    } catch (err) {
      message.error(err?.message || '加载权限数据失败')
    } finally {
      setLoading(false)
    }
  }, [adminRpc])

  React.useEffect(() => {
    loadData()
  }, [loadData])

  const openEditModal = (admin) => {
    if (!admin || admin.level === 0) {
      return
    }
    const normalized = normalizeMenuPermissions(admin.menu_permissions || [])
    setEditingAdmin(admin)
    setSelectedPermissions(normalized.length ? normalized : defaultMenuPermissions())
    setModalOpen(true)
  }

  const closeEditModal = () => {
    setModalOpen(false)
    setEditingAdmin(null)
    setSelectedPermissions([])
  }

  const savePermissions = async () => {
    if (!editingAdmin) {
      return
    }

    setSaving(true)
    try {
      await adminRpc.call('set_permissions', {
        id: editingAdmin.id,
        menu_permissions: normalizeMenuPermissions(selectedPermissions),
      })
      message.success('权限已更新')
      closeEditModal()
      await loadData()
    } catch (err) {
      message.error(err?.message || '更新权限失败')
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    {
      title: '管理员',
      dataIndex: 'username',
      width: 160,
    },
    {
      title: '等级',
      dataIndex: 'level',
      width: 120,
      render: (level) => levelTextMap[level] || `未知(${level})`,
    },
    {
      title: '状态',
      dataIndex: 'disabled',
      width: 100,
      render: (disabled) => <Tag color={disabled ? 'red' : 'green'}>{disabled ? '禁用' : '启用'}</Tag>,
    },
    {
      title: '菜单权限',
      dataIndex: 'menu_permissions',
      render: (_, record) => {
        if (record.level === 0) {
          return <Tag color="gold">全部菜单</Tag>
        }
        const normalized = normalizeMenuPermissions(record.menu_permissions || [])
        const effective = normalized.length ? normalized : defaultMenuPermissions()
        return (
          <Space wrap size={[4, 6]}>
            {effective.slice(0, 4).map((key) => (
              <Tag key={key}>{getPermissionLabel(key)}</Tag>
            ))}
            {effective.length > 4 ? <Text type="secondary">+{effective.length - 4}</Text> : null}
          </Space>
        )
      },
    },
    {
      title: '操作',
      width: 120,
      render: (_, record) => {
        if (record.level === 0) {
          return <Text type="secondary">系统保留</Text>
        }
        return (
          <Button size="small" disabled={!isSuperAdmin} onClick={() => openEditModal(record)}>
            编辑权限
          </Button>
        )
      },
    },
  ]

  const checkboxOptions = ERP_MENU_PERMISSION_OPTIONS.filter((item) => item.key !== '/system/permissions').map((item) => ({
    label: item.label,
    value: item.key,
  }))

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card className="erp-page-card" bordered={false}>
        <Title level={4} style={{ margin: 0 }}>
          权限管理
        </Title>
        <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
          菜单权限仅用于控制左侧菜单显示，不影响接口数据权限。
        </Paragraph>
      </Card>

      {!isSuperAdmin ? (
        <Alert
          type="warning"
          showIcon
          message="仅超级管理员可修改菜单权限"
          description="当前账号可查看权限分配结果，但不能修改。"
        />
      ) : null}

      <Card className="erp-page-card" bordered={false}>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={admins}
          loading={loading}
          pagination={{ pageSize: 8 }}
          locale={{ emptyText: <Empty description="暂无管理员数据" /> }}
          scroll={{ x: 900 }}
        />
      </Card>

      <Modal
        title={editingAdmin ? `编辑权限：${editingAdmin.username}` : '编辑权限'}
        open={modalOpen}
        onCancel={closeEditModal}
        onOk={savePermissions}
        confirmLoading={saving}
        destroyOnClose
      >
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Text type="secondary">勾选后该管理员可在菜单看到对应页面入口。</Text>
          <Checkbox.Group
            style={{ width: '100%' }}
            value={selectedPermissions}
            onChange={(values) => setSelectedPermissions(values)}
          >
            <div className="erp-permission-grid">
              {checkboxOptions.map((item) => (
                <Checkbox key={item.value} value={item.value}>
                  {item.label}
                </Checkbox>
              ))}
            </div>
          </Checkbox.Group>
        </Space>
      </Modal>
    </Space>
  )
}

export default PermissionCenterPage

