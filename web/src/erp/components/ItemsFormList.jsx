import React from 'react'
import {
  Button,
  Col,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Typography,
} from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'

const { Text } = Typography

const renderItemField = (field) => {
  if (field.type === 'number') {
    return <InputNumber min={0} style={{ width: '100%' }} />
  }
  if (field.type === 'select') {
    return <Select options={field.options || []} />
  }
  return <Input />
}

const ItemsFormList = ({ name, label, fields }) => {
  return (
    <Form.Item label={label} required>
      <Form.List name={name}>
        {(itemFields, { add, remove }) => (
          <Space direction="vertical" style={{ width: '100%' }} size={12}>
            {itemFields.map((itemField) => (
              <Row gutter={8} key={itemField.key} align="middle">
                {fields.map((field) => (
                  <Col span={field.span || 6} key={field.name}>
                    <Form.Item
                      name={[itemField.name, field.name]}
                      rules={
                        field.required
                          ? [
                              {
                                required: true,
                                message: `请输入${field.label}`,
                              },
                            ]
                          : []
                      }
                    >
                      {renderItemField(field)}
                    </Form.Item>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {field.label}
                    </Text>
                  </Col>
                ))}
                <Col span={2}>
                  <Button
                    danger
                    type="text"
                    icon={<DeleteOutlined />}
                    onClick={() => remove(itemField.name)}
                  />
                </Col>
              </Row>
            ))}
            <Button type="dashed" icon={<PlusOutlined />} onClick={() => add()}>
              添加条目
            </Button>
          </Space>
        )}
      </Form.List>
    </Form.Item>
  )
}

export default ItemsFormList
