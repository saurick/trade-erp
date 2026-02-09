import React from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import ERPLayout from './components/ERPLayout'
import { moduleDefinitions } from './config/moduleDefinitions'
import DashboardPage from './pages/DashboardPage'
import PrintCenterPage from './pages/PrintCenterPage'
import ModuleTablePage from './components/ModuleTablePage'

const ERPRouter = () => {
  return (
    <Routes>
      <Route path="/" element={<ERPLayout />}>
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
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default ERPRouter
