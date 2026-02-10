import React, { useEffect, useMemo, useState } from 'react'
import {
  ApartmentOutlined,
  AppstoreOutlined,
  AuditOutlined,
  DashboardOutlined,
  FileTextOutlined,
  HomeOutlined,
  InboxOutlined,
  PrinterOutlined,
  SettingOutlined,
  ShoppingCartOutlined,
  SwapOutlined,
  WalletOutlined,
} from '@ant-design/icons'
import { Breadcrumb, Button, Layout, Menu, Space, Spin, Tag, Typography } from 'antd'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { JsonRpc } from '@/common/utils/jsonRpc'
import { AUTH_SCOPE, logout } from '@/common/auth/auth'
import { menuSections } from '../config/moduleDefinitions'
import { normalizeMenuPermissions } from '../config/menuPermissions'

const { Header, Sider, Content } = Layout
const { Text } = Typography

const iconMap = {
  dashboard: <DashboardOutlined />,
  partners: <ApartmentOutlined />,
  products: <AppstoreOutlined />,
  quotations: <FileTextOutlined />,
  exportSales: <SwapOutlined />,
  purchaseContracts: <ShoppingCartOutlined />,
  inbound: <InboxOutlined />,
  inventory: <HomeOutlined />,
  shipmentDetails: <AuditOutlined />,
  outbound: <AuditOutlined />,
  settlements: <WalletOutlined />,
  bankReceipts: <WalletOutlined />,
  'print-center': <PrinterOutlined />,
  'permission-center': <SettingOutlined />,
}

const levelTagConfig = {
  0: { color: 'gold', label: '超级管理员' },
  1: { color: 'blue', label: '一级管理员' },
  2: { color: 'purple', label: '二级管理员' },
}

const ERPLayout = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [profileLoading, setProfileLoading] = useState(true)
  const [adminProfile, setAdminProfile] = useState(null)

  const authRpc = useMemo(() => new JsonRpc({ url: 'auth', authScope: AUTH_SCOPE.ADMIN }), [])
  const adminRpc = useMemo(() => new JsonRpc({ url: 'admin', authScope: AUTH_SCOPE.ADMIN }), [])

  useEffect(() => {
    let mounted = true

    const loadProfile = async () => {
      setProfileLoading(true)
      try {
        const res = await adminRpc.call('me', {})
        if (!mounted) {
          return
        }
        setAdminProfile(res?.data || null)
      } catch (err) {
        if (!mounted) {
          return
        }
        logout(AUTH_SCOPE.ADMIN)
        navigate('/admin-login', { replace: true, state: { from: location } })
      } finally {
        if (mounted) {
          setProfileLoading(false)
        }
      }
    }

    loadProfile()
    return () => {
      mounted = false
    }
  }, [adminRpc, location, navigate])

  const allItems = useMemo(() => menuSections.flatMap((section) => section.items), [])
  const isSuperAdmin = adminProfile?.level === 0
  const allowedPermissions = normalizeMenuPermissions(adminProfile?.menu_permissions || [])

  const visibleSections = useMemo(() => {
    if (isSuperAdmin) {
      return menuSections
    }

    return menuSections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => allowedPermissions.includes(item.key)),
      }))
      .filter((section) => section.items.length > 0)
  }, [allowedPermissions, isSuperAdmin])

  const menuItems = useMemo(
    () =>
      visibleSections.map((section) => ({
        type: 'group',
        label: section.title,
        key: section.key,
        children: section.items.map((item) => ({
          key: item.key,
          icon: iconMap[item.moduleKey] || <FileTextOutlined />,
          label: item.label,
        })),
      })),
    [visibleSections]
  )

  const currentItem = allItems.find((item) => item.key === location.pathname)
  const selectedKeys = currentItem ? [currentItem.key] : []
  const currentLevelTag = levelTagConfig[adminProfile?.level] || { color: 'default', label: '未识别角色' }

  const handleLogout = async () => {
    try {
      await authRpc.call('logout')
    } catch (err) {
      // 退出时忽略服务端失败，前端态必须清空。
      console.warn('logout failed', err)
    } finally {
      logout(AUTH_SCOPE.ADMIN)
      navigate('/admin-login', { replace: true })
    }
  }

  if (profileLoading) {
    return (
      <Layout className="erp-app-shell">
        <div className="erp-layout-loading">
          <Space direction="vertical" align="center">
            <Spin size="large" />
            <Text type="secondary">正在加载管理员信息...</Text>
          </Space>
        </div>
      </Layout>
    )
  }

  return (
    <Layout className="erp-app-shell">
      <Sider breakpoint="lg" collapsedWidth="0" width={260} className="erp-sider">
        <div className="erp-sider-brand">
          <Space>
            <SwapOutlined />
            <span>Trade ERP</span>
          </Space>
        </div>
        <Menu
          mode="inline"
          selectedKeys={selectedKeys}
          className="erp-menu"
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>

      <Layout>
        <Header className="erp-header">
          <Space>
            <Text strong>外销 ERP 管理后台</Text>
            <Tag color="green">Phase 1</Tag>
          </Space>
          <Space size={8}>
            <Tag color={currentLevelTag.color}>{currentLevelTag.label}</Tag>
            <Text type="secondary">{adminProfile?.username || '-'}</Text>
            <Button size="small" onClick={handleLogout}>
              退出
            </Button>
          </Space>
        </Header>

        <Content className="erp-content">
          <Breadcrumb
            style={{ marginBottom: 12 }}
            items={[
              { title: 'ERP' },
              { title: currentItem?.label || '业务看板' },
            ]}
          />
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}

export default ERPLayout
