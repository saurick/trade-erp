import React, { useMemo, useState } from 'react'
import { Button, Card, Col, Row, Space, Tabs, Tag, Typography, Upload, message } from 'antd'
import { PrinterOutlined, UploadOutlined } from '@ant-design/icons'
import { openPrintWindow, templateList, uploadTemplateFile } from '../data/printTemplates'
import { useERPData } from '../data/ERPDataContext'

const { Paragraph, Text, Title } = Typography

const recordSourceMap = {
  quotation: 'quotations',
  pi: 'exportSales',
  production: 'exportSales',
  purchase: 'purchaseContracts',
  invoice: 'shipmentDetails',
  packing: 'shipmentDetails',
  delivery: 'shipmentDetails',
  billingInfo: 'partners',
}

const PrintCenterPage = () => {
  const { moduleRecords } = useERPData()
  const [activeKey, setActiveKey] = useState(templateList[0]?.key)
  const [uploading, setUploading] = useState(false)

  const activeRecord = useMemo(() => {
    const moduleKey = recordSourceMap[activeKey]
    if (!moduleKey) {
      return {}
    }
    return (moduleRecords[moduleKey] || [])[0] || {}
  }, [activeKey, moduleRecords])

  const activeTemplate = useMemo(
    () => templateList.find((item) => item.key === activeKey),
    [activeKey]
  )

  const handleOpenEditablePrint = async () => {
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
    .filter(([key]) => !['id', 'module_key', 'created_at', 'updated_at'].includes(key))
    .slice(0, 10)

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card className="erp-page-card" bordered={false}>
        <Title level={4} style={{ margin: 0 }}>
          打印模板中心
        </Title>
        <Paragraph type="secondary" style={{ marginBottom: 0, marginTop: 8 }}>
          打印会加载原始模板，模板区所有单元格可编辑后再打印。已接入：外销形式发票模版、采购合同模版、杭州科森磁材开票信息模板。
        </Paragraph>
      </Card>

      <Card className="erp-page-card" bordered={false}>
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
                  >
                    打开可编辑打印窗口
                  </Button>
                  <Upload
                    accept=".xls,.xlsx"
                    showUploadList={false}
                    customRequest={handleUploadTemplate}
                    disabled={uploading}
                  >
                    <Button icon={<UploadOutlined />} loading={uploading}>
                      上传当前模板（覆盖）
                    </Button>
                  </Upload>
                </Space>

                <Paragraph style={{ marginBottom: 0 }}>
                  模板提示：采购合同默认使用 `purchase-contract-template.xls`；发票相关默认使用
                  `export-invoice-template.xls`；开票信息默认使用 `billing-info-template.html`（来源于开票信息文件整理）。
                </Paragraph>

                <div>
                  <Text strong>当前记录字段预览（前 10 项）：</Text>
                  <div style={{ marginTop: 8 }}>
                    {activeRecordFields.length === 0 ? (
                      <Text type="secondary">暂无记录，可先在对应业务模块新增数据。</Text>
                    ) : (
                      <Space direction="vertical" size={4}>
                        {activeRecordFields.map(([key, value]) => (
                          <Text key={key} type="secondary">
                            {key}: {typeof value === 'object' ? JSON.stringify(value) : String(value)}
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
