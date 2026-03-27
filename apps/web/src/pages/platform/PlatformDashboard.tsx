import React, { useEffect, useState } from 'react'
import {
  Row,
  Col,
  Card,
  Statistic,
  Table,
  Tag,
  Typography,
  Spin,
  Empty,
  Badge,
} from 'antd'
import {
  TeamOutlined,
  DollarOutlined,
  WarningOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons'
import request from '../../utils/request'
import { formatCurrency, formatDateTime } from '../../utils/format'

const { Title, Text } = Typography

interface DashboardStats {
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

const lifecycleColors: Record<string, string> = {
  trial: 'blue',
  active: 'green',
  grace: 'orange',
  suspended: 'red',
  stopped: 'default',
  cancelled: 'default',
}

const lifecycleLabels: Record<string, string> = {
  trial: '试用中',
  active: '正常',
  grace: '宽限期',
  suspended: '已暂停',
  stopped: '已停服',
  cancelled: '已注销',
}

const orderStatusColors: Record<string, string> = {
  pending: 'orange',
  paid: 'green',
  refunded: 'red',
  cancelled: 'default',
}

const orderColumns = [
  { title: '订单号', dataIndex: 'orderId', key: 'orderId', width: 200 },
  { title: '套餐', dataIndex: 'planId', key: 'planId' },
  {
    title: '金额',
    dataIndex: 'amount',
    key: 'amount',
    render: (v: number) => formatCurrency(v),
  },
  {
    title: '状态',
    dataIndex: 'paymentStatus',
    key: 'paymentStatus',
    render: (v: string) => (
      <Tag color={orderStatusColors[v] ?? 'default'}>
        {{ pending: '待支付', paid: '已支付', refunded: '已退款', cancelled: '已取消' }[v] ?? v}
      </Tag>
    ),
  },
  {
    title: '创建时间',
    dataIndex: 'createdAt',
    key: 'createdAt',
    render: (v: string) => formatDateTime(v),
  },
]

const PlatformDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    request
      .get<DashboardStats>('/admin/dashboard')
      .then((res: any) => setStats(res.data ?? res))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Spin style={{ display: 'block', margin: '80px auto' }} />

  if (!stats) return <Empty description="暂无数据" />

  const { tenantStats, monthlyRevenue, recentOrders } = stats

  return (
    <div>
      <Title level={4} style={{ marginBottom: 24 }}>
        平台运营总览
      </Title>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="租户总数"
              value={tenantStats.total}
              prefix={<TeamOutlined style={{ color: '#1677ff' }} />}
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="正常使用"
              value={tenantStats.active}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="试用中"
              value={tenantStats.trial}
              prefix={<TeamOutlined style={{ color: '#faad14' }} />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="本月收入"
              value={monthlyRevenue}
              prefix={<DollarOutlined style={{ color: '#722ed1' }} />}
              formatter={(v) => formatCurrency(Number(v))}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Card title="租户状态分布">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {Object.entries(lifecycleLabels).map(([key, label]) => {
                const count =
                  key === 'trial'
                    ? tenantStats.trial
                    : key === 'active'
                    ? tenantStats.active
                    : key === 'suspended'
                    ? tenantStats.suspended
                    : 0
                return (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Tag color={lifecycleColors[key]}>{label}</Tag>
                    <div
                      style={{
                        flex: 1,
                        height: 8,
                        background: '#f0f0f0',
                        borderRadius: 4,
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${tenantStats.total ? (count / tenantStats.total) * 100 : 0}%`,
                          background:
                            key === 'active'
                              ? '#52c41a'
                              : key === 'trial'
                              ? '#1677ff'
                              : '#ff4d4f',
                          borderRadius: 4,
                        }}
                      />
                    </div>
                    <Text style={{ minWidth: 30, textAlign: 'right' }}>{count}</Text>
                  </div>
                )
              })}
            </div>
            {tenantStats.expiringSoon > 0 && (
              <div style={{ marginTop: 16, padding: 12, background: '#fff7e6', borderRadius: 8 }}>
                <WarningOutlined style={{ color: '#faad14', marginRight: 8 }} />
                <Text type="warning">
                  <strong>{tenantStats.expiringSoon}</strong> 个租户将在 30 天内到期
                </Text>
              </div>
            )}
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="最近订单">
            <Table
              dataSource={recentOrders}
              columns={orderColumns}
              rowKey="id"
              size="small"
              pagination={false}
              scroll={{ x: true }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default PlatformDashboard
