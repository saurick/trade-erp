import React from 'react'
import { ConfigProvider, theme } from 'antd'
import ERPRouter from './erp/router'
import { ERPDataProvider } from './erp/data/ERPDataContext'

const App = () => {
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#2b8a3e',
          borderRadius: 10,
          fontFamily: '"Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif',
        },
      }}
    >
      <ERPDataProvider>
        <ERPRouter />
      </ERPDataProvider>
    </ConfigProvider>
  )
}

export default App
