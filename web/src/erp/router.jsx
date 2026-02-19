import React from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import AuthGuard from '@/common/auth/AuthGuard'
import ERPLayout from './components/ERPLayout'
import { moduleDefinitions } from './config/moduleDefinitions'
import DashboardPage from './pages/DashboardPage'
import PrintCenterPage from './pages/PrintCenterPage'
import ModuleTablePage from './components/ModuleTablePage'
import AdminLoginPage from './pages/AdminLoginPage'
import PermissionCenterPage from './pages/PermissionCenterPage'

const ERPRouter = () => {
  return (
    <Routes>
      <Route path="/admin-login" element={<AdminLoginPage />} />
      <Route
        path="/"
        element={
          <AuthGuard requireAdmin>
            <ERPLayout />
          </AuthGuard>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        {moduleDefinitions.map((moduleItem) => (
          <Route
            key={moduleItem.key}
            path={moduleItem.path.slice(1)}
            element={<ModuleTablePage moduleItem={moduleItem} />}
          />
        ))}
        <Route path="docs/print-center" element={<PrintCenterPage />} />
        <Route path="system/permissions" element={<PermissionCenterPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default ERPRouter
