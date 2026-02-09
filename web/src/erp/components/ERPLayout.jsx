import React from 'react'
import {
  ApartmentOutlined,
  AppstoreOutlined,
  AuditOutlined,
  DashboardOutlined,
  FileTextOutlined,
  HomeOutlined,
  InboxOutlined,
  PrinterOutlined,
  ShoppingCartOutlined,
  SwapOutlined,
  WalletOutlined,
} from '@ant-design/icons'
import { Breadcrumb, Layout, Menu, Space, Tag, Typography } from 'antd'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { menuSections } from '../config/moduleDefinitions'

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
}

const ERPLayout = () => {
  const navigate = useNavigate()
  const location = useLocation()

  const menuItems = menuSections.map((section) => ({
    type: 'group',
    label: section.title,
    key: section.key,
    children: section.items.map((item) => ({
      key: item.key,
      icon: iconMap[item.moduleKey] || <FileTextOutlined />,
      label: item.label,
    })),
  }))

  const currentItem = menuSections.flatMap((section) => section.items).find((item) => item.key === location.pathname)

  const selectedKeys = currentItem ? [currentItem.key] : []

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
            <Tag color="green">MVP</Tag>
          </Space>
          <Text type="secondary">本地部署 / Docker 兼容</Text>
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
