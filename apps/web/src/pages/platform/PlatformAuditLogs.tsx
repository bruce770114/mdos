import React, { useEffect, useState } from 'react'
import {
  Card, Table, Select, Input, DatePicker, Tag, Button, Space, Typography, Row, Col,
} from 'antd'
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons'
import request from '../../utils/request'
import { formatDateTime } from '../../utils/format'

const { Title } = Typography
const { Option } = Select
const { RangePicker } = DatePicker

interface AuditLog {
  id: string
  tenantId: string | null
  userId: string | null
  username: string | null
  action: string
  module: string
  resourceId: string | null
  changes: Record<string, any> | null
  ipAddress: string | null
  success: boolean
  errorMessage: string | null
  createdAt: string
}

const ACTION_LABELS: Record<string, string> = {
  create: '创建',
  update: '更新',
  delete: '删除',
  login: '登录',
  logout: '登出',
}

const MODULE_LABELS: Record<string, string> = {
  tenant: '租户',
  user: '用户',
  space: '存储空间',
  plan: '套餐',
  order: '订单',
  auth: '认证',
}

const PlatformAuditLogs: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<{ list: AuditLog[]; total: number }>({ list: [], total: 0 })
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [filters, setFilters] = useState<{
    module?: string
    action?: string
    userId?: string
    startDate?: string
    endDate?: string
  }>({})

  const fetchData = () => {
    setLoading(true)
    const params: Record<string, any> = { page, pageSize, ...filters }
    if (filters.startDate) params.startDate = filters.startDate
    if (filters.endDate) params.endDate = filters.endDate

    request.get('/admin/audit-logs', { params })
      .then((r: any) => {
        const res = r.data ?? r
        setData({ list: res.list ?? [], total: res.total ?? 0 })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [page, pageSize, filters])

  const handleSearch = (values: any) => {
    setFilters(values)
    setPage(1)
  }

  const columns = [
    { title: '时间', dataIndex: 'createdAt', width: 170, render: (v: string) => formatDateTime(v) },
    { title: '模块', dataIndex: 'module', width: 100, render: (v: string) => MODULE_LABELS[v] || v },
    { title: '操作', dataIndex: 'action', width: 100, render: (v: string) => ACTION_LABELS[v] || v },
    { title: '用户', dataIndex: 'username', width: 120 },
    { title: '资源ID', dataIndex: 'resourceId', width: 180, render: (v: string) => v || '-' },
    {
      title: '结果',
      dataIndex: 'success',
      width: 80,
      render: (v: boolean) => (
        <Tag color={v ? 'green' : 'red'}>{v ? '成功' : '失败'}</Tag>
      ),
    },
    { title: 'IP地址', dataIndex: 'ipAddress', width: 130, render: (v: string) => v || '-' },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>审计日志</Title>
        <Button icon={<ReloadOutlined />} onClick={fetchData}>刷新</Button>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col>
            <Select
              placeholder="模块"
              allowClear
              style={{ width: 120 }}
              value={filters.module}
              onChange={(v) => { setFilters({ ...filters, module: v }); setPage(1) }}
            >
              {Object.entries(MODULE_LABELS).map(([k, v]) => (
                <Option key={k} value={k}>{v}</Option>
              ))}
            </Select>
          </Col>
          <Col>
            <Select
              placeholder="操作"
              allowClear
              style={{ width: 100 }}
              value={filters.action}
              onChange={(v) => { setFilters({ ...filters, action: v }); setPage(1) }}
            >
              {Object.entries(ACTION_LABELS).map(([k, v]) => (
                <Option key={k} value={k}>{v}</Option>
              ))}
            </Select>
          </Col>
          <Col>
            <Input
              placeholder="用户ID"
              style={{ width: 150 }}
              value={filters.userId}
              onChange={(e) => setFilters({ ...filters, userId: e.target.value || undefined })}
              onPressEnter={() => { setPage(1); fetchData() }}
            />
          </Col>
          <Col>
            <RangePicker
              onChange={(dates, dateStrings) => {
                setFilters({
                  ...filters,
                  startDate: dateStrings[0] || undefined,
                  endDate: dateStrings[1] || undefined,
                })
                setPage(1)
              }}
            />
          </Col>
        </Row>
      </Card>

      <Table
        columns={columns}
        dataSource={data.list}
        rowKey="id"
        loading={loading}
        scroll={{ x: 800 }}
        pagination={{
          current: page,
          pageSize,
          total: data.total,
          onChange: setPage,
          showTotal: (t) => `共 ${t} 条`,
        }}
      />
    </div>
  )
}

export default PlatformAuditLogs
