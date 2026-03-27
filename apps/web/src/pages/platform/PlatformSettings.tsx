import React, { useEffect, useState } from 'react'
import {
  Table, Button, Modal, Form, Input, Select, Tag, message, Card, Typography, Space, Popconfirm, Tabs,
} from 'antd'
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons'
import request from '../../utils/request'
import { formatDateTime } from '../../utils/format'

const { Title } = Typography

interface SystemConfig {
  id: string
  configKey: string
  configValue: string
  category: string
  description: string | null
  isPublic: boolean
  createdAt: string
  updatedAt: string
}

const CATEGORIES = [
  { value: 'general', label: '通用配置' },
  { value: 'security', label: '安全配置' },
  { value: 'email', label: '邮件配置' },
  { value: 'sms', label: '短信配置' },
  { value: 'payment', label: '支付配置' },
  { value: 'feature', label: '功能开关' },
]

const PlatformSettings: React.FC = () => {
  const [configs, setConfigs] = useState<SystemConfig[]>([])
  const [loading, setLoading] = useState(false)
  const [createVisible, setCreateVisible] = useState(false)
  const [editConfig, setEditConfig] = useState<SystemConfig | null>(null)
  const [activeCategory, setActiveCategory] = useState<string>('general')
  const [form] = Form.useForm()

  const fetchConfigs = () => {
    setLoading(true)
    request.get('/admin/configs', { params: { category: activeCategory } })
      .then((r: any) => {
        setConfigs(r.data ?? r)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchConfigs() }, [activeCategory])

  const handleCreate = async (values: any) => {
    try {
      await request.post('/admin/configs', values)
      message.success('创建成功')
      setCreateVisible(false)
      form.resetFields()
      fetchConfigs()
    } catch (e: any) {
      message.error(e?.response?.data?.message ?? '创建失败')
    }
  }

  const handleEdit = async (values: any) => {
    if (!editConfig) return
    try {
      await request.post('/admin/configs', { ...values, configKey: editConfig.configKey })
      message.success('更新成功')
      setEditConfig(null)
      form.resetFields()
      fetchConfigs()
    } catch (e: any) {
      message.error(e?.response?.data?.message ?? '更新失败')
    }
  }

  const handleDelete = async (key: string) => {
    try {
      await request.delete(`/admin/configs/${key}`)
      message.success('删除成功')
      fetchConfigs()
    } catch (e: any) {
      message.error(e?.response?.data?.message ?? '删除失败')
    }
  }

  const columns = [
    { title: '配置键', dataIndex: 'configKey', width: 200 },
    { title: '配置值', dataIndex: 'configValue', width: 250, ellipsis: true },
    { title: '描述', dataIndex: 'description', width: 200, render: (v: string) => v || '-' },
    {
      title: '公开',
      dataIndex: 'isPublic',
      width: 80,
      render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? '是' : '否'}</Tag>,
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (_: any, r: SystemConfig) => (
        <Space size="small">
          <Button
            type="link" size="small" icon={<EditOutlined />}
            onClick={() => {
              setEditConfig(r)
              form.setFieldsValue(r)
            }}
          >
            编辑
          </Button>
          <Popconfirm title="确认删除此配置？" onConfirm={() => handleDelete(r.configKey)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const tabItems = CATEGORIES.map(c => ({
    key: c.value,
    label: c.label,
    children: (
      <Table
        columns={columns}
        dataSource={configs}
        rowKey="id"
        loading={loading}
        pagination={false}
      />
    ),
  }))

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>系统配置</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateVisible(true)}>
          添加配置
        </Button>
      </div>

      <Card>
        <Tabs
          activeKey={activeCategory}
          onChange={setActiveCategory}
          items={tabItems}
        />
      </Card>

      {/* Create Modal */}
      <Modal
        title="添加系统配置"
        open={createVisible}
        onCancel={() => { setCreateVisible(false); form.resetFields() }}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate} style={{ marginTop: 16 }}>
          <Form.Item name="configKey" label="配置键" rules={[{ required: true }]}>
            <Input placeholder="如: system.name" />
          </Form.Item>
          <Form.Item name="configValue" label="配置值" rules={[{ required: true }]}>
            <Input placeholder="配置值" />
          </Form.Item>
          <Form.Item name="category" label="分类" rules={[{ required: true }]} initialValue={activeCategory}>
            <Select placeholder="选择分类">
              {CATEGORIES.map(c => (
                <Select.Option key={c.value} value={c.value}>{c.label}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} placeholder="配置说明（可选）" />
          </Form.Item>
          <Form.Item name="isPublic" label="是否公开" valuePropName="checked" initialValue={false}>
            <Select initialValue={false}>
              <Select.Option value={true}>是</Select.Option>
              <Select.Option value={false}>否</Select.Option>
            </Select>
          </Form.Item>
          <div style={{ textAlign: 'right' }}>
            <Button onClick={() => setCreateVisible(false)} style={{ marginRight: 8 }}>取消</Button>
            <Button type="primary" htmlType="submit">创建</Button>
          </div>
        </Form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        title="编辑系统配置"
        open={!!editConfig}
        onCancel={() => { setEditConfig(null); form.resetFields() }}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleEdit} style={{ marginTop: 16 }}>
          <Form.Item label="配置键">
            <Input value={editConfig?.configKey} disabled />
          </Form.Item>
          <Form.Item name="configValue" label="配置值" rules={[{ required: true }]}>
            <Input placeholder="配置值" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} placeholder="配置说明（可选）" />
          </Form.Item>
          <div style={{ textAlign: 'right' }}>
            <Button onClick={() => setEditConfig(null)} style={{ marginRight: 8 }}>取消</Button>
            <Button type="primary" htmlType="submit">保存</Button>
          </div>
        </Form>
      </Modal>
    </div>
  )
}

export default PlatformSettings
