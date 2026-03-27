import React, { useEffect, useState, useCallback } from 'react'
import {
  Table, Button, Modal, Form, Input, InputNumber, Select, Tag,
  message, Card, Row, Col, Space, Typography, Divider,
} from 'antd'
import { PlusOutlined, CheckCircleOutlined } from '@ant-design/icons'
import request from '../../utils/request'
import { formatCurrency, formatDateTime } from '../../utils/format'

const { Title, Text } = Typography
const { Option } = Select

interface Order {
  id: string
  orderId: string
  tenantId: string
  planId: string
  orderType: string
  billingCycle: string
  amount: number
  validFrom: string | null
  validTo: string | null
  paymentStatus: string
  paymentMethod: string
  paidAt: string | null
  invoiceStatus: string
  createdAt: string
}

const ORDER_TYPE_LABELS: Record<string, string> = {
  new: '新购',
  renewal: '续费',
  upgrade: '升级',
  downgrade: '降级',
  gift: '赠送',
}
const PAYMENT_COLORS: Record<string, string> = {
  pending: 'orange',
  paid: 'green',
  refunded: 'red',
  cancelled: 'default',
}
const PAYMENT_LABELS: Record<string, string> = {
  pending: '待支付',
  paid: '已支付',
  refunded: '已退款',
  cancelled: '已取消',
}

const PlatformOrders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string | undefined>()
  const [createVisible, setCreateVisible] = useState(false)
  const [tenants, setTenants] = useState<any[]>([])
  const [plans, setPlans] = useState<any[]>([])
  const [form] = Form.useForm()

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, any> = { page, pageSize: 20 }
      if (statusFilter) params.paymentStatus = statusFilter
      const res: any = await request.get('/admin/orders', { params })
      const data = res.data ?? res
      setOrders(data.list ?? [])
      setTotal(data.total ?? 0)
    } catch {}
    setLoading(false)
  }, [page, statusFilter])

  useEffect(() => { fetchOrders() }, [fetchOrders])
  useEffect(() => {
    request.get('/admin/tenants?pageSize=200').then((r: any) => {
      const d = r.data ?? r
      setTenants(d.list ?? [])
    }).catch(() => {})
    request.get('/admin/plans').then((r: any) => setPlans(r.data ?? r)).catch(() => {})
  }, [])

  const handleCreate = async (values: any) => {
    try {
      await request.post('/admin/orders', values)
      message.success('订单创建成功')
      setCreateVisible(false)
      form.resetFields()
      fetchOrders()
    } catch (e: any) {
      message.error(e?.response?.data?.message ?? '创建失败')
    }
  }

  const handleConfirmPayment = async (orderId: string) => {
    try {
      await request.patch(`/admin/orders/${orderId}/confirm-payment`)
      message.success('支付确认成功，租户已激活')
      fetchOrders()
    } catch (e: any) {
      message.error(e?.response?.data?.message ?? '操作失败')
    }
  }

  const columns = [
    {
      title: '订单号',
      dataIndex: 'orderId',
      width: 200,
      render: (v: string) => <Text copyable style={{ fontSize: 12 }}>{v}</Text>,
    },
    {
      title: '租户',
      dataIndex: 'tenantId',
      width: 120,
      render: (v: string) => {
        const t = tenants.find((t) => t.id === v)
        return t ? t.name : <Text type="secondary">{v.slice(0, 8)}...</Text>
      },
    },
    { title: '套餐', dataIndex: 'planId', width: 120 },
    {
      title: '类型',
      dataIndex: 'orderType',
      render: (v: string) => ORDER_TYPE_LABELS[v] ?? v,
    },
    {
      title: '计费周期',
      dataIndex: 'billingCycle',
      render: (v: string) => v === 'yearly' ? '年付' : '月付',
    },
    {
      title: '金额',
      dataIndex: 'amount',
      render: (v: number) => <Text strong>{formatCurrency(v)}</Text>,
    },
    {
      title: '有效期',
      key: 'validity',
      render: (_: any, r: Order) =>
        r.validFrom && r.validTo
          ? `${formatDateTime(r.validFrom).slice(0, 10)} ~ ${formatDateTime(r.validTo).slice(0, 10)}`
          : '-',
    },
    {
      title: '支付状态',
      dataIndex: 'paymentStatus',
      render: (v: string) => (
        <Tag color={PAYMENT_COLORS[v] ?? 'default'}>{PAYMENT_LABELS[v] ?? v}</Tag>
      ),
    },
    {
      title: '支付方式',
      dataIndex: 'paymentMethod',
      render: (v: string) => ({
        wechat: '微信', alipay: '支付宝', bank_transfer: '对公转账',
        platform_gift: '平台赠送', none: '-',
      }[v] ?? v),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      render: (v: string) => formatDateTime(v).slice(0, 10),
    },
    {
      title: '操作',
      key: 'actions',
      fixed: 'right' as const,
      width: 100,
      render: (_: any, r: Order) =>
        r.paymentStatus === 'pending' ? (
          <Button
            type="link" size="small" icon={<CheckCircleOutlined />}
            onClick={() => handleConfirmPayment(r.orderId)}
          >
            确认支付
          </Button>
        ) : null,
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>订阅订单</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateVisible(true)}>
          手动开单
        </Button>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Select
          placeholder="全部状态"
          style={{ width: 140 }}
          allowClear
          value={statusFilter}
          onChange={(v) => { setStatusFilter(v); setPage(1) }}
        >
          {Object.entries(PAYMENT_LABELS).map(([k, v]) => (
            <Option key={k} value={k}>{v}</Option>
          ))}
        </Select>
      </Card>

      <Table
        columns={columns}
        dataSource={orders}
        rowKey="id"
        loading={loading}
        scroll={{ x: 1200 }}
        pagination={{
          current: page,
          pageSize: 20,
          total,
          onChange: setPage,
          showTotal: (t) => `共 ${t} 条`,
        }}
      />

      {/* Create Order Modal */}
      <Modal
        title="手动创建订单"
        open={createVisible}
        onCancel={() => { setCreateVisible(false); form.resetFields() }}
        footer={null}
        width={560}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate} style={{ marginTop: 16 }}>
          <Form.Item name="tenantId" label="租户" rules={[{ required: true }]}>
            <Select showSearch optionFilterProp="children" placeholder="选择租户">
              {tenants.map((t) => (
                <Option key={t.id} value={t.id}>{t.name} ({t.code})</Option>
              ))}
            </Select>
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="planId" label="套餐" rules={[{ required: true }]}>
                <Select placeholder="选择套餐">
                  {plans.map((p) => (
                    <Option key={p.planId} value={p.planId}>{p.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="orderType" label="订单类型" rules={[{ required: true }]} initialValue="new">
                <Select>
                  {Object.entries(ORDER_TYPE_LABELS).map(([k, v]) => (
                    <Option key={k} value={k}>{v}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="billingCycle" label="计费周期" rules={[{ required: true }]} initialValue="yearly">
                <Select>
                  <Option value="monthly">月付</Option>
                  <Option value="yearly">年付</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="amount" label="金额（元）" rules={[{ required: true }]} initialValue={0}>
                <InputNumber min={0} style={{ width: '100%' }} prefix="¥" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="paymentMethod" label="支付方式" rules={[{ required: true }]} initialValue="platform_gift">
            <Select>
              <Option value="wechat">微信支付</Option>
              <Option value="alipay">支付宝</Option>
              <Option value="bank_transfer">对公转账</Option>
              <Option value="platform_gift">平台赠送（立即激活）</Option>
            </Select>
          </Form.Item>
          <Form.Item name="notes" label="备注">
            <Input.TextArea rows={2} />
          </Form.Item>
          <div style={{ textAlign: 'right' }}>
            <Button onClick={() => setCreateVisible(false)} style={{ marginRight: 8 }}>取消</Button>
            <Button type="primary" htmlType="submit">创建订单</Button>
          </div>
        </Form>
      </Modal>
    </div>
  )
}

export default PlatformOrders
