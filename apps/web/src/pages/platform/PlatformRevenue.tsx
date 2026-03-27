import React, { useEffect, useState } from 'react'
import {
  Card, Row, Col, Statistic, Select, Table, Typography, Spin,
} from 'antd'
import { DollarOutlined, RiseOutlined, ShoppingCartOutlined } from '@ant-design/icons'
import request from '../../utils/request'
import { formatCurrency } from '../../utils/format'

const { Title } = Typography
const { Option } = Select

interface RevenueData {
  totalRevenue: number
  periodRevenue: number
  byPlan: Array<{ planId: string; total: number; count: number }>
  monthlyTrend: Array<{ month: string; total: number; count: number }>
  byPaymentMethod: Array<{ method: string; total: number; count: number }>
  orderStats: { total: number; paid: number; pending: number }
}

const PlatformRevenue: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<RevenueData | null>(null)
  const [period, setPeriod] = useState<'month' | 'quarter' | 'year'>('month')

  const fetchData = () => {
    setLoading(true)
    request.get('/admin/revenue', { params: { period } })
      .then((r: any) => setData(r.data ?? r))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [period])

  if (!data) {
    return <div style={{ padding: 24 }}><Spin /></div>
  }

  const { totalRevenue, periodRevenue, byPlan, monthlyTrend, byPaymentMethod, orderStats } = data

  const planColumns = [
    { title: '套餐', dataIndex: 'planId', width: 150 },
    { title: '订单数', dataIndex: 'count', width: 100 },
    { title: '收入', dataIndex: 'total', render: (v: number) => formatCurrency(v) },
  ]

  const paymentColumns = [
    { title: '支付方式', dataIndex: 'method', width: 150 },
    { title: '订单数', dataIndex: 'count', width: 100 },
    { title: '金额', dataIndex: 'total', render: (v: number) => formatCurrency(v) },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>收入报表</Title>
        <Select value={period} onChange={setPeriod} style={{ width: 120 }}>
          <Option value="month">本月</Option>
          <Option value="quarter">本季度</Option>
          <Option value="year">本年</Option>
        </Select>
      </div>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card>
            <Statistic
              title="历史总收入"
              value={totalRevenue}
              prefix={<DollarOutlined />}
              precision={2}
              suffix="元"
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title={`${period === 'month' ? '本月' : period === 'quarter' ? '本季度' : '本年'}收入`}
              value={periodRevenue}
              prefix={<RiseOutlined />}
              precision={2}
              suffix="元"
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="订单总数"
              value={orderStats.total}
              prefix={<ShoppingCartOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={12}>
          <Card title="按套餐分布">
            <Table
              dataSource={byPlan}
              rowKey="planId"
              size="small"
              pagination={false}
              columns={planColumns}
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="按支付方式分布">
            <Table
              dataSource={byPaymentMethod}
              rowKey="method"
              size="small"
              pagination={false}
              columns={paymentColumns}
            />
          </Card>
        </Col>
      </Row>

      <Card title="月度趋势">
        <Table
          dataSource={monthlyTrend}
          rowKey="month"
          size="small"
          pagination={false}
          columns={[
            { title: '月份', dataIndex: 'month', render: (v: string) => v?.slice(0, 7) },
            { title: '订单数', dataIndex: 'count' },
            { title: '收入', dataIndex: 'total', render: (v: number) => formatCurrency(v) },
          ]}
        />
      </Card>
    </div>
  )
}

export default PlatformRevenue
