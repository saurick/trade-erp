import React, { useMemo, useState } from 'react'
import { Button, Card, Col, Row, Space, Tabs, Tag, Typography } from 'antd'
import { PrinterOutlined } from '@ant-design/icons'
import { buildTemplateData, openPrintWindow, templateList } from '../data/printTemplates'
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
}

const PrintCenterPage = () => {
  const { moduleRecords } = useERPData()
  const [activeKey, setActiveKey] = useState(templateList[0]?.key)

  const activeRecord = useMemo(() => {
    const moduleKey = recordSourceMap[activeKey]
    if (!moduleKey) {
      return {}
    }
    return (moduleRecords[moduleKey] || [])[0] || {}
  }, [activeKey, moduleRecords])

  const activeTemplate = useMemo(
    () => buildTemplateData(activeKey, activeRecord),
    [activeKey, activeRecord]
  )

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card className="erp-page-card" bordered={false}>
        <Title level={4} style={{ margin: 0 }}>
          打印模板中心
        </Title>
        <Paragraph type="secondary" style={{ marginBottom: 0, marginTop: 8 }}>
          提供报价单、PI、采购合同、商业发票、装箱单、送货单、生产加工申请单固定模板。
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
                    {activeTemplate.title}
                  </Title>
                  <Tag color="blue">{activeTemplate.documentNo}</Tag>
                </Space>
                <Text>客户/对象：{activeTemplate.customer}</Text>
                <Text>日期：{activeTemplate.date}</Text>
                <Paragraph style={{ marginBottom: 0 }}>
                  模板说明：可从对应模块导入最新记录生成打印内容。
                </Paragraph>
                <Button type="primary" icon={<PrinterOutlined />} onClick={() => openPrintWindow(activeKey, activeRecord)}>
                  打印当前模板
                </Button>
              </Space>
            </Card>
          </Col>
        </Row>
      </Card>
    </Space>
  )
}

export default PrintCenterPage
