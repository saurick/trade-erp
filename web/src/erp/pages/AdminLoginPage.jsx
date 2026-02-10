import React, { useMemo, useState } from 'react'
import { Alert, Button, Card, Form, Input, Space, Typography } from 'antd'
import { useLocation, useNavigate } from 'react-router-dom'
import { JsonRpc } from '@/common/utils/jsonRpc'
import { AUTH_SCOPE, persistAuth } from '@/common/auth/auth'

const { Title } = Typography

const AdminLoginPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const authRpc = useMemo(() => new JsonRpc({ url: 'auth', authScope: AUTH_SCOPE.ADMIN }), [])

  const redirectTo =
    (location.state?.from?.pathname || '/dashboard') +
    (location.state?.from?.search || '') +
    (location.state?.from?.hash || '')

  const onFinish = async (values) => {
    setLoading(true)
    setError('')

    try {
      const result = await authRpc.call('admin_login', {
        username: values.username.trim(),
        password: values.password,
      })
      persistAuth(result?.data, AUTH_SCOPE.ADMIN)
      navigate(redirectTo, { replace: true })
    } catch (err) {
      setError(err?.message || '登录失败，请检查账号密码')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="erp-login-page">
      <div className="erp-login-page__bg" />
      <Card bordered={false} className="erp-login-card">
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <img src="/templates/billing-info-logo.png" alt="KS Magnetics" className="erp-login-logo" />
          <div>
            <Title level={3} style={{ marginBottom: 6 }}>
              外销 ERP 管理后台
            </Title>
          </div>
          {error ? <Alert type="error" showIcon message={error} /> : null}
          <Form layout="vertical" onFinish={onFinish}>
            <Form.Item
              label="管理员账号"
              name="username"
              rules={[{ required: true, message: '请输入管理员账号' }]}
            >
              <Input placeholder="请输入账号" autoComplete="username" size="large" />
            </Form.Item>
            <Form.Item
              label="密码"
              name="password"
              rules={[{ required: true, message: '请输入密码' }]}
            >
              <Input.Password placeholder="请输入密码" autoComplete="current-password" size="large" />
            </Form.Item>
            <Form.Item style={{ marginBottom: 4 }}>
              <Button type="primary" htmlType="submit" size="large" block loading={loading}>
                登录
              </Button>
            </Form.Item>
          </Form>
        </Space>
      </Card>
    </div>
  )
}

export default AdminLoginPage
