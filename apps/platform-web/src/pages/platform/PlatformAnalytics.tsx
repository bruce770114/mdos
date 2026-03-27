import React, { useEffect, useState } from 'react'
import {
  Card, Row, Col, Statistic, Table, Select, DatePicker, Typography, Tag,
} from 'antd'
import {
  TeamOutlined, RiseOutlined, DollarOutlined, WarningOutlined,
} from '@ant-design/icons'
import request from '../../utils/request'
import { formatCurrency } from '../../utils/format'

const { Title, Text } = Typography
const { Option } = Select
const { RangePicker } = DatePicker

interface DashboardData {
  tenantStats: {
    total: number
    trial: number
    active: number
    suspended: number
    expiringSoon: number
  }
  monthlyRevenue: number
  recentOrders: Array<{
    id: string
    orderId: string
    tenantId: string
    planId: string
    amount: number
    paymentStatus: string
    createdAt: string
  }>
}

const LIFECYCLE_LABELS: Record<string, string> = {
  trial: '试用中',
  active: '正常使用',
  grace: '宽限期',
  suspended: '欠费暂停',
  stopped: '已停服',
  cancelled: '已注销',
}

const PlatformAnalytics: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<DashboardData | null>(null)

  const fetchData = () => {
    setLoading(true)
    request.get<DashboardData>('/admin/dashboard')
      .then((r: any) => setData(r.data ?? r))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [])

  if (!data) {
    return <div style={{ padding: 24 }}>加载中...</div>
  }

  const { tenantStats, monthlyRevenue, recentOrders } = data

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>运营分析</Title>
      </div>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="租户总数"
              value={tenantStats.total}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="活跃租户"
              value={tenantStats.active}
              prefix={<RiseOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="本月收入"
              value={monthlyRevenue}
              prefix={<DollarOutlined />}
              precision={2}
              suffix="元"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="即将到期 (30天)"
              value={tenantStats.expiringSoon}
              prefix={<WarningOutlined />}
              valueStyle={{ color: tenantStats.expiringSoon > 0 ? '#faad14' : undefined }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={12}>
          <Card title="租户状态分布">
            <Row gutter={16}>
              <Col span={8}>
                <Statistic title="试用中" value={tenantStats.trial} />
                <Text type="secondary">试用</Text>
              </Col>
              <Col span={8}>
                <Statistic title="正常使用" value={tenantStats.active} />
                <Text type="secondary">活跃</Text>
              </Col>
              <Col span={8}>
                <Statistic title="已暂停" value={tenantStats.suspended} />
                <Text type="secondary">暂停</Text>
              </Col>
            </Row>
          </Card>
        </Col>
        <Col span={12}>
          <Card title="收入概览">
            <Row gutter={16}>
              <Col span={12}>
                <Statistic
                  title="本月收入"
                  value={monthlyRevenue}
                  precision={2}
                  suffix="元"
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="订单数"
                  value={recentOrders.length}
                />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      <Card title="最近订单">
        <Table
          dataSource={recentOrders}
          rowKey="id"
          size="small"
          pagination={false}
          columns={[
            { title: '订单号', dataIndex: 'orderId', width: 180 },
            { title: '套餐', dataIndex: 'planId', width: 120 },
            {
              title: '金额',
              dataIndex: 'amount',
              width: 100,
              render: (v: number) => formatCurrency(v),
            },
            {
              title: '状态',
              dataIndex: 'paymentStatus',
              width: 100,
              render: (v: string) => (
                <Tag color={v === 'paid' ? 'green' : v === 'pending' ? 'orange' : 'default'}>
                  {v === 'paid' ? '已支付' : v === 'pending' ? '待支付' : v}
                </Tag>
              ),
            },
            { title: '时间', dataIndex: 'createdAt', render: (v: string) => v?.slice(0, 10) },
          ]}
        />
      </Card>
    </div>
  )
}

export default PlatformAnalytics
