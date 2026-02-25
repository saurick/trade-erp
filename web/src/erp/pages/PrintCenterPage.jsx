import React, { useEffect, useMemo, useState } from 'react'
import {
  Button,
  Card,
  Col,
  Row,
  Space,
  Tabs,
  Tag,
  Typography,
  Upload,
  message,
} from 'antd'
import { PrinterOutlined, UploadOutlined } from '@ant-design/icons'
import {
  openPrintWindow,
  templateList,
  uploadTemplateFile,
} from '../data/printTemplates'
import { useERPData } from '../data/ERPDataContext'
import {
  hasPrintableRecord,
  pickPrintableRecord,
} from '../utils/printCenterRecord'

const { Paragraph, Text, Title } = Typography

const recordSourceMap = {
  pi: 'exportSales',
  purchase: 'purchaseContracts',
  billingInfo: 'partners',
}

const PrintCenterPage = () => {
  const { moduleRecords, ensureModuleLoaded, isModuleLoading } = useERPData()
  const [activeKey, setActiveKey] = useState(templateList[0]?.key)
  const [uploading, setUploading] = useState(false)
  const activeModuleKey = recordSourceMap[activeKey] || ''

  useEffect(() => {
    if (!activeModuleKey) {
      return
    }
    // 打印中心不依赖路由预取，切换模板时主动兜底拉取对应模块记录。
    ensureModuleLoaded(activeModuleKey).catch((err) => {
      const code = Number(err?.code)
      if ([10005, 10006, 40302].includes(code)) {
        message.warning('当前模板记录加载失败，请重新登录或检查权限')
        return
      }
      message.error(err?.message || '加载当前模板记录失败')
    })
  }, [activeModuleKey, ensureModuleLoaded])

  const activeRecordList = useMemo(() => {
    if (!activeModuleKey) {
      return []
    }
    return moduleRecords[activeModuleKey] || []
  }, [activeModuleKey, moduleRecords])

  const activeRecord = useMemo(
    () => pickPrintableRecord(activeRecordList),
    [activeRecordList]
  )
  const hasActiveRecord = useMemo(
    () => hasPrintableRecord(activeRecordList),
    [activeRecordList]
  )
  const activeRecordLoading = activeModuleKey
    ? isModuleLoading(activeModuleKey)
    : false

  const activeTemplate = useMemo(
    () => templateList.find((item) => item.key === activeKey),
    [activeKey]
  )
  const uploadDisabled =
    activeKey === 'billingInfo' ||
    activeKey === 'pi' ||
    activeKey === 'purchase'

  const handleOpenEditablePrint = async () => {
    if (!hasActiveRecord) {
      message.warning('当前模板缺少数据库记录，请先在对应业务菜单新增数据')
      return
    }
    try {
      await openPrintWindow(activeKey, activeRecord)
    } catch (err) {
      message.error(err?.message || '打开模板失败')
    }
  }

  const handleUploadTemplate = async ({ file, onSuccess, onError }) => {
    setUploading(true)
    try {
      await uploadTemplateFile(activeKey, file)
      message.success('模板已上传并覆盖当前模板')
      onSuccess?.({}, file)
    } catch (err) {
      message.error(err?.message || '模板上传失败')
      onError?.(err)
    } finally {
      setUploading(false)
    }
  }

  const activeRecordFields = Object.entries(activeRecord || {})
    .filter(
      ([key]) => !['id', 'module_key', 'created_at', 'updated_at'].includes(key)
    )
    .slice(0, 10)

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card className="erp-page-card" variant="borderless">
        <Title level={4} style={{ margin: 0 }}>
          打印模板中心
        </Title>
        <Paragraph type="secondary" style={{ marginBottom: 0, marginTop: 8 }}>
          打印会加载原始模板。Excel
          模板单元格支持编辑后再打印；开票信息、外销形式发票、采购合同为固定版式模板（参考原始文件坐标），支持左右字段双向同步并可编辑（logo/水印/示意图除外）。已接入：外销形式发票模版、采购合同模版、杭州科森磁材开票信息模板。
        </Paragraph>
      </Card>

      <Card className="erp-page-card" variant="borderless">
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={8}>
            <Tabs
              tabPosition="left"
              activeKey={activeKey}
              onChange={setActiveKey}
              items={templateList.map((template) => ({
                key: template.key,
                label: template.title,
                children: null,
              }))}
            />
          </Col>
          <Col xs={24} lg={16}>
            <Card size="small" style={{ background: '#fbfffb' }}>
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                <Space>
                  <Title level={5} style={{ margin: 0 }}>
                    {activeTemplate?.title || '模板'}
                  </Title>
                  <Tag color="blue">当前记录字段会在弹窗中显示并可编辑</Tag>
                </Space>

                <Space wrap>
                  <Button
                    type="primary"
                    icon={<PrinterOutlined />}
                    onClick={handleOpenEditablePrint}
                    disabled={!hasActiveRecord || activeRecordLoading}
                  >
                    打开可编辑打印窗口
                  </Button>
                  <Upload
                    accept=".xls,.xlsx"
                    showUploadList={false}
                    customRequest={handleUploadTemplate}
                    disabled={uploading || uploadDisabled}
                  >
                    <Button
                      icon={<UploadOutlined />}
                      loading={uploading}
                      disabled={uploadDisabled}
                    >
                      上传当前模板（覆盖）
                    </Button>
                  </Upload>
                </Space>

                <Paragraph style={{ marginBottom: 0 }}>
                  模板提示：当前仅保留采购合同、PI、开票信息三种模板，均为固定版式（来源于原始文件版式）。
                </Paragraph>
                {!activeRecordLoading && !hasActiveRecord ? (
                  <Text type="warning">
                    当前模板暂无数据库记录，打印按钮已禁用。
                  </Text>
                ) : null}
                {uploadDisabled ? (
                  <Text type="secondary">
                    {activeKey === 'billingInfo'
                      ? '开票信息模板已锁定为 1:1 固定版式，不支持上传覆盖。'
                      : activeKey === 'pi'
                        ? '外销形式发票模板已锁定为 1:1 固定版式，不支持上传覆盖。'
                        : '采购合同模板已锁定为 1:1 固定版式，不支持上传覆盖。'}
                  </Text>
                ) : null}

                <div>
                  <Text strong>当前记录字段预览（前 10 项）：</Text>
                  <div style={{ marginTop: 8 }}>
                    {activeRecordLoading ? (
                      <Text type="secondary">记录加载中...</Text>
                    ) : activeRecordFields.length === 0 ? (
                      <Text type="secondary">
                        暂无记录，可先在对应业务模块新增数据。
                      </Text>
                    ) : (
                      <Space direction="vertical" size={4}>
                        {activeRecordFields.map(([key, value]) => (
                          <Text key={key} type="secondary">
                            {key}:{' '}
                            {typeof value === 'object'
                              ? JSON.stringify(value)
                              : String(value)}
                          </Text>
                        ))}
                      </Space>
                    )}
                  </div>
                </div>
              </Space>
            </Card>
          </Col>
        </Row>
      </Card>
    </Space>
  )
}

export default PrintCenterPage
