import React, { useMemo, useState } from 'react'
import { Button, Card, Col, Row, Space, Tabs, Tag, Typography, message } from 'antd'
import { PrinterOutlined } from '@ant-design/icons'
import { printCss, printTemplates } from '../data/printTemplates'

const { Paragraph, Text, Title } = Typography

const renderSheet = (template) => {
  return `
  <section class="print-sheet">
    <h1 class="print-title">${template.title}</h1>
    <div class="print-meta">
      <span>单号：${template.documentNo}</span>
      <span>日期：${template.date}</span>
    </div>
    <div class="print-meta">
      <span>客户/对象：${template.customer}</span>
      <span>模板：固定格式输出</span>
    </div>
    <table class="print-table">
      <thead>
        <tr>
          <th>序号</th>
          <th>品名/说明</th>
          <th>数量</th>
          <th>单价/说明</th>
          <th>金额/结果</th>
        </tr>
      </thead>
      <tbody>
        ${template.rows
          .map(
            (row) => `
          <tr>
            <td>${row.no}</td>
            <td>${row.item}</td>
            <td>${row.qty}</td>
            <td>${row.unitPrice}</td>
            <td>${row.amount}</td>
          </tr>
        `
          )
          .join('')}
      </tbody>
    </table>
    <p class="print-footer">备注：${template.footer}</p>
  </section>
`
}

const PrintCenterPage = () => {
  const [activeKey, setActiveKey] = useState(printTemplates[0]?.key)

  const activeTemplate = useMemo(
    () => printTemplates.find((template) => template.key === activeKey) || printTemplates[0],
    [activeKey]
  )

  const handlePrint = () => {
    if (!activeTemplate) {
      message.error('未找到模板内容')
      return
    }

    const printWindow = window.open('', '_blank', 'width=1024,height=768')
    if (!printWindow) {
      message.error('浏览器阻止了打印窗口，请允许弹窗后重试')
      return
    }

    const html = `
      <html>
        <head>
          <title>${activeTemplate.title}</title>
          <style>${printCss}</style>
        </head>
        <body>
          ${renderSheet(activeTemplate)}
        </body>
      </html>
    `

    printWindow.document.open()
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
    printWindow.close()
  }

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card className="erp-page-card" bordered={false}>
        <Title level={4} style={{ margin: 0 }}>
          打印模板中心
        </Title>
        <Paragraph type="secondary" style={{ marginBottom: 0, marginTop: 8 }}>
          提供报价单、PI、采购合同、商业发票、装箱单、送货单固定模板。可直接预览并打印。
        </Paragraph>
      </Card>

      <Card className="erp-page-card" bordered={false}>
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={8}>
            <Tabs
              tabPosition="left"
              activeKey={activeKey}
              onChange={setActiveKey}
              items={printTemplates.map((template) => ({
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
                <Paragraph style={{ marginBottom: 0 }}>模板说明：{activeTemplate.footer}</Paragraph>
                <Button type="primary" icon={<PrinterOutlined />} onClick={handlePrint}>
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
