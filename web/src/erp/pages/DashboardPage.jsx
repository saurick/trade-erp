import React, { useMemo } from 'react'
import {
  Card,
  Col,
  Progress,
  Row,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd'
import { moduleDefinitions } from '../config/moduleDefinitions'
import { BOX_STATUS } from '../constants/workflow'
import { useERPData } from '../data/ERPDataContext'

const { Paragraph, Title } = Typography

const DashboardPage = () => {
  const { moduleRecords } = useERPData()

  const summary = useMemo(() => {
    const boxCount = {
      [BOX_STATUS.DRAFT]: 0,
      [BOX_STATUS.PENDING]: 0,
      [BOX_STATUS.APPROVED]: 0,
      [BOX_STATUS.CLAIM]: 0,
      [BOX_STATUS.CONFIRMED]: 0,
      [BOX_STATUS.AUTO]: 0,
    }

    let totalRecords = 0

    Object.values(moduleRecords).forEach((records) => {
      totalRecords += records.length
      records.forEach((record) => {
        if (record.box && boxCount[record.box] !== undefined) {
          boxCount[record.box] += 1
        }
      })
    })

    return {
      totalRecords,
      boxCount,
    }
  }, [moduleRecords])

  const moduleRows = moduleDefinitions.map((moduleItem) => {
    const records = moduleRecords[moduleItem.key] || []
    return {
      key: moduleItem.key,
      module: moduleItem.title,
      count: records.length,
      draft: records.filter((record) => record.box === BOX_STATUS.DRAFT).length,
      pending: records.filter((record) => record.box === BOX_STATUS.PENDING)
        .length,
      approved: records.filter((record) => record.box === BOX_STATUS.APPROVED)
        .length,
      auto: records.filter((record) => record.box === BOX_STATUS.AUTO).length,
      claim: records.filter((record) => record.box === BOX_STATUS.CLAIM).length,
      confirmed: records.filter((record) => record.box === BOX_STATUS.CONFIRMED)
        .length,
    }
  })

  const completionRatio = summary.totalRecords
    ? Math.round(
        ((summary.boxCount[BOX_STATUS.APPROVED] +
          summary.boxCount[BOX_STATUS.AUTO]) /
          summary.totalRecords) *
          100
      )
    : 0

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card className="erp-page-card" variant="borderless">
        <Title level={4} style={{ marginTop: 0 }}>
          外销 ERP 管理后台
        </Title>
        <Paragraph type="secondary" style={{ marginBottom: 0 }}>
          覆盖客户/供应商、产品、报价、外销、采购、入库、库存、出运、出库、结汇、水单认领，并提供固定模板打印入口。
        </Paragraph>
      </Card>

      <Row gutter={[12, 12]}>
        <Col xs={24} sm={12} lg={6}>
          <Card className="erp-page-card" variant="borderless">
            <Statistic title="业务记录总数" value={summary.totalRecords} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="erp-page-card" variant="borderless">
            <Statistic
              title="待批箱"
              value={summary.boxCount[BOX_STATUS.PENDING]}
              valueStyle={{ color: '#d46b08' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="erp-page-card" variant="borderless">
            <Statistic
              title="招领箱"
              value={summary.boxCount[BOX_STATUS.CLAIM]}
              valueStyle={{ color: '#ad6800' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="erp-page-card" variant="borderless">
            <Statistic
              title="已完成（已批+免批）"
              value={completionRatio}
              suffix="%"
              valueStyle={{ color: '#389e0d' }}
            />
          </Card>
        </Col>
      </Row>

      <Card className="erp-page-card" variant="borderless">
        <Space direction="vertical" style={{ width: '100%' }}>
          <Title level={5} style={{ margin: 0 }}>
            状态箱分布
          </Title>
          <Row gutter={[12, 12]}>
            {Object.entries(summary.boxCount).map(([status, count]) => (
              <Col xs={24} md={12} lg={8} key={status}>
                <Card
                  size="small"
                  variant="borderless"
                  style={{ background: '#f7faf7' }}
                >
                  <Space
                    direction="vertical"
                    style={{ width: '100%' }}
                    size={6}
                  >
                    <Tag>{status}</Tag>
                    <Progress
                      percent={
                        summary.totalRecords
                          ? Math.round((count / summary.totalRecords) * 100)
                          : 0
                      }
                    />
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
        </Space>
      </Card>

      <Card className="erp-page-card" variant="borderless">
        <Table
          size="middle"
          pagination={false}
          rowKey="key"
          columns={[
            { title: '模块', dataIndex: 'module' },
            { title: '记录数', dataIndex: 'count' },
            { title: '草稿箱', dataIndex: 'draft' },
            { title: '待批箱', dataIndex: 'pending' },
            { title: '已批箱', dataIndex: 'approved' },
            { title: '免批', dataIndex: 'auto' },
            { title: '招领箱', dataIndex: 'claim' },
            { title: '确认箱', dataIndex: 'confirmed' },
          ]}
          dataSource={moduleRows}
        />
      </Card>
    </Space>
  )
}

export default DashboardPage
