import React, { useEffect, useState } from 'react'
import {
  Table, Button, Modal, Form, Input, InputNumber, Select, Switch,
  Tag, message, Card, Row, Col, Statistic, Space, Typography, Divider,
} from 'antd'
import { PlusOutlined, EditOutlined } from '@ant-design/icons'
import request from '../../utils/request'
import { formatCurrency } from '../../utils/format'

const { Title, Text } = Typography
const { Option } = Select

interface Plan {
  id: string
  planId: string
  name: string
  tier: string
  priceMonthly: number
  priceYearly: number
  maxUsers: number
  maxProjects: number
  storageGB: number
  trialDays: number
  isActive: boolean
  description: string | null
}

const TIER_COLORS: Record<string, string> = {
  trial: 'blue',
  standard: 'cyan',
  professional: 'purple',
  enterprise: 'gold',
}
const TIER_LABELS: Record<string, string> = {
  trial: '试用版',
  standard: '标准版',
  professional: '专业版',
  enterprise: '旗舰版',
}

const PlatformPlans: React.FC = () => {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(false)
  const [createVisible, setCreateVisible] = useState(false)
  const [editPlan, setEditPlan] = useState<Plan | null>(null)
  const [form] = Form.useForm()
  const [editForm] = Form.useForm()

  const fetch = (includeInactive = true) => {
    setLoading(true)
    request.get<Plan[]>(`/admin/plans?includeInactive=${includeInactive}`)
      .then((r: any) => setPlans(r.data ?? r))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetch() }, [])

  const handleCreate = async (values: any) => {
    try {
      await request.post('/admin/plans', values)
      message.success('套餐创建成功')
      setCreateVisible(false)
      form.resetFields()
      fetch()
    } catch (e: any) {
      message.error(e?.response?.data?.message ?? '创建失败')
    }
  }

  const handleEdit = async (values: any) => {
    if (!editPlan) return
    try {
      await request.patch(`/admin/plans/${editPlan.planId}`, values)
      message.success('更新成功')
      setEditPlan(null)
      fetch()
    } catch {}
  }

  const columns = [
    {
      title: '套餐',
      key: 'plan',
      render: (_: any, r: Plan) => (
        <div>
          <div style={{ fontWeight: 600 }}>{r.name}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>{r.planId}</Text>
        </div>
      ),
    },
    {
      title: '档次',
      dataIndex: 'tier',
      render: (v: string) => <Tag color={TIER_COLORS[v]}>{TIER_LABELS[v] ?? v}</Tag>,
    },
    {
      title: '月付价格',
      dataIndex: 'priceMonthly',
      render: (v: number) => v ? formatCurrency(v) + '/月' : '免费',
    },
    {
      title: '年付价格',
      dataIndex: 'priceYearly',
      render: (v: number) => v ? formatCurrency(v) + '/年' : '免费',
    },
    {
      title: '用户数',
      dataIndex: 'maxUsers',
      render: (v: number) => v === -1 ? '不限' : `${v} 人`,
    },
    {
      title: '项目数',
      dataIndex: 'maxProjects',
      render: (v: number) => v === -1 ? '不限' : `${v} 个`,
    },
    {
      title: '存储',
      dataIndex: 'storageGB',
      render: (v: number) => v === -1 ? '不限' : `${v} GB`,
    },
    {
      title: '试用天数',
      dataIndex: 'trialDays',
      render: (v: number) => v ? `${v} 天` : '-',
    },
    {
      title: '上架',
      dataIndex: 'isActive',
      render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? '已上架' : '已下架'}</Tag>,
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, r: Plan) => (
        <Button
          type="link" size="small" icon={<EditOutlined />}
          onClick={() => {
            setEditPlan(r)
            editForm.setFieldsValue({
              name: r.name, priceMonthly: r.priceMonthly, priceYearly: r.priceYearly,
              maxUsers: r.maxUsers, maxProjects: r.maxProjects, storageGB: r.storageGB,
              trialDays: r.trialDays, isActive: r.isActive, description: r.description,
            })
          }}
        >
          编辑
        </Button>
      ),
    },
  ]

  const planFormItems = (
    <>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item name="priceMonthly" label="月付价格（元）" initialValue={0}>
            <InputNumber min={0} style={{ width: '100%' }} prefix="¥" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="priceYearly" label="年付价格（元）" initialValue={0}>
            <InputNumber min={0} style={{ width: '100%' }} prefix="¥" />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={8}>
          <Form.Item name="maxUsers" label="用户数上限" initialValue={10} extra="-1 表示不限">
            <InputNumber min={-1} style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="maxProjects" label="项目数上限" initialValue={5} extra="-1 表示不限">
            <InputNumber min={-1} style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="storageGB" label="存储 (GB)" initialValue={50} extra="-1 表示不限">
            <InputNumber min={-1} style={{ width: '100%' }} />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item name="trialDays" label="试用天数" initialValue={0}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="isActive" label="是否上架" valuePropName="checked" initialValue={true}>
            <Switch checkedChildren="上架" unCheckedChildren="下架" />
          </Form.Item>
        </Col>
      </Row>
      <Form.Item name="description" label="描述">
        <Input.TextArea rows={2} />
      </Form.Item>
    </>
  )

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>套餐管理</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateVisible(true)}>
          新建套餐
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={plans}
        rowKey="id"
        loading={loading}
        scroll={{ x: 1000 }}
        pagination={false}
      />

      {/* Create Modal */}
      <Modal
        title="新建套餐"
        open={createVisible}
        onCancel={() => { setCreateVisible(false); form.resetFields() }}
        footer={null}
        width={580}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate} style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="planId" label="套餐 ID" rules={[{ required: true, pattern: /^[a-z0-9_]+$/ }]}>
                <Input placeholder="plan_standard" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="name" label="套餐名称" rules={[{ required: true }]}>
                <Input placeholder="标准版" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="tier" label="档次" rules={[{ required: true }]}>
            <Select>
              {Object.entries(TIER_LABELS).map(([k, v]) => (
                <Option key={k} value={k}><Tag color={TIER_COLORS[k]}>{v}</Tag></Option>
              ))}
            </Select>
          </Form.Item>
          {planFormItems}
          <div style={{ textAlign: 'right' }}>
            <Button onClick={() => setCreateVisible(false)} style={{ marginRight: 8 }}>取消</Button>
            <Button type="primary" htmlType="submit">创建</Button>
          </div>
        </Form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        title={`编辑套餐 — ${editPlan?.name}`}
        open={!!editPlan}
        onCancel={() => setEditPlan(null)}
        footer={null}
        width={580}
      >
        <Form form={editForm} layout="vertical" onFinish={handleEdit} style={{ marginTop: 16 }}>
          <Form.Item name="name" label="套餐名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          {planFormItems}
          <div style={{ textAlign: 'right' }}>
            <Button onClick={() => setEditPlan(null)} style={{ marginRight: 8 }}>取消</Button>
            <Button type="primary" htmlType="submit">保存</Button>
          </div>
        </Form>
      </Modal>
    </div>
  )
}

export default PlatformPlans
