import React, { useEffect, useState } from 'react'
import {
  Card,
  Descriptions,
  Tag,
  Table,
  Typography,
  Row,
  Col,
  Statistic,
  Alert,
  Spin,
} from 'antd'
import {
  CheckCircleOutlined,
  WarningOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons'
import request from '../../utils/request'
import { formatDateTime, formatCurrency } from '../../utils/format'

const { Title, Text } = Typography

interface SubscriptionInfo {
  tenant: {
    id: string
    name: string
    code: string
    lifecycleStatus: string
  }
  subscription: {
    planId: string | null
    planName: string | null
    planTier: string | null
    expiresAt: string | null
    daysRemaining: number | null
    isExpired: boolean
    isExpiringSoon: boolean
  }
  planDetails: {
    maxUsers: number
    maxProjects: number
    storageGB: number
    priceMonthly: number
    priceYearly: number
  } | null
  orders: Array<{
    id: string
    orderType: string
    planId: string
    amount: number
    paymentStatus: string
    validFrom: string
    validTo: string
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

const LIFECYCLE_COLORS: Record<string, string> = {
  trial: 'blue',
  active: 'green',
  grace: 'orange',
  suspended: 'red',
  stopped: 'default',
  cancelled: 'default',
}

const ORDER_TYPE_LABELS: Record<string, string> = {
  new: '新购',
  renewal: '续费',
  upgrade: '升级',
  downgrade: '降级',
  gift: '赠送',
}

const Subscription: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<SubscriptionInfo | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    request.get<SubscriptionInfo>('/subscription/info')
      .then((res: any) => {
        const info = res.data ?? res
        setData(info)
      })
      .catch((err: any) => {
        setError(err?.response?.data?.message ?? '获取订阅信息失败')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <Spin size="large" />
      </div>
    )
  }

  if (error || !data) {
    return <Alert message="错误" description={error ?? '无法加载订阅信息'} type="error" showIcon />
  }

  const { tenant, subscription, planDetails, orders } = data

  // Alert for expiration status
  let statusAlert = null
  if (subscription.isExpired) {
    statusAlert = (
      <Alert
        message="订阅已过期"
        description="您的订阅已过期，请尽快续费以继续使用全部功能。"
        type="error"
        showIcon
        icon={<WarningOutlined />}
        style={{ marginBottom: 16 }}
      />
    )
  } else if (subscription.isExpiringSoon && subscription.daysRemaining !== null) {
    statusAlert = (
      <Alert
        message={`订阅即将到期 (${subscription.daysRemaining}天)`}
        description="您的订阅即将到期，请及时续费。"
        type="warning"
        showIcon
        icon={<ClockCircleOutlined />}
        style={{ marginBottom: 16 }}
      />
    )
  }

  return (
    <div>
      <Title level={4} style={{ marginBottom: 16 }}>订阅信息</Title>

      {statusAlert}

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card>
            <Statistic
              title="当前套餐"
              value={subscription.planName ?? '未订阅'}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: subscription.planName ? '#3f8600' : '#cf1322' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="到期时间"
              value={subscription.expiresAt ? formatDateTime(subscription.expiresAt).slice(0, 10) : '永久'}
              suffix={subscription.daysRemaining !== null ? `(${subscription.daysRemaining}天)` : ''}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="账户状态"
              value={LIFECYCLE_LABELS[tenant.lifecycleStatus] ?? tenant.lifecycleStatus}
              valueStyle={{ color: LIFECYCLE_COLORS[tenant.lifecycleStatus] === 'green' ? '#3f8600' : '#cf1322' }}
            />
          </Card>
        </Col>
      </Row>

      <Card title="套餐详情" style={{ marginBottom: 16 }}>
        {planDetails ? (
          <Descriptions bordered size="small" column={3}>
            <Descriptions.Item label="套餐ID">{subscription.planId}</Descriptions.Item>
            <Descriptions.Item label="套餐名称">{subscription.planName}</Descriptions.Item>
            <Descriptions.Item label="套餐等级">
              <Tag color={subscription.planTier === 'enterprise' ? 'purple' : subscription.planTier === 'professional' ? 'blue' : 'default'}>
                {subscription.planTier}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="最大用户数">{planDetails.maxUsers}</Descriptions.Item>
            <Descriptions.Item label="最大项目数">{planDetails.maxProjects}</Descriptions.Item>
            <Descriptions.Item label="存储空间">{planDetails.storageGB} GB</Descriptions.Item>
            <Descriptions.Item label="月付价格">{formatCurrency(planDetails.priceMonthly)}</Descriptions.Item>
            <Descriptions.Item label="年付价格">{formatCurrency(planDetails.priceYearly)}</Descriptions.Item>
          </Descriptions>
        ) : (
          <Text type="secondary">暂无套餐详情</Text>
        )}
      </Card>

      <Card title="最近订单">
        <Table
          dataSource={orders}
          rowKey="id"
          size="small"
          pagination={{ pageSize: 5 }}
          columns={[
            { title: '订单ID', dataIndex: 'id', width: 180 },
            { title: '类型', dataIndex: 'orderType', render: (v: string) => ORDER_TYPE_LABELS[v] ?? v },
            { title: '套餐', dataIndex: 'planId' },
            { title: '金额', dataIndex: 'amount', render: (v: number) => formatCurrency(v) },
            {
              title: '状态',
              dataIndex: 'paymentStatus',
              render: (v: string) => (
                <Tag color={v === 'paid' ? 'green' : v === 'pending' ? 'orange' : 'default'}>
                  {v === 'paid' ? '已支付' : v === 'pending' ? '待支付' : v}
                </Tag>
              ),
            },
            { title: '有效期', render: (_: any, r: any) => `${r.validFrom?.slice(0, 10) ?? '-'} ~ ${r.validTo?.slice(0, 10) ?? '-'}` },
          ]}
        />
      </Card>
    </div>
  )
}

export default Subscription
