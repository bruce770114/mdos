import React, { useEffect, useState } from 'react'
import {
  Table, Button, Modal, Form, Input, Select, InputNumber, Tag,
  message, Card, Row, Col, Statistic, Progress, Typography, Space, Drawer,
} from 'antd'
import { PlusOutlined, EditOutlined, EyeOutlined } from '@ant-design/icons'
import request from '../../utils/request'
import { formatDateTime } from '../../utils/format'

const { Title, Text } = Typography
const { Option } = Select

interface Space {
  id: string
  spaceId: string
  name: string
  type: 'shared' | 'dedicated'
  dbInstance: string
  schemaName: string
  region: string
  maxTenants: number
  currentTenants: number
  storageUsedGB: number
  storageLimitGB: number
  status: string
  notes: string | null
  createdAt: string
}

interface Tenant {
  id: string
  name: string
  code: string
  slug: string
  lifecycleStatus: string
  currentPlanId: string | null
  subscriptionExpiresAt: string | null
}

const STATUS_COLORS: Record<string, string> = {
  active: 'green',
  full: 'red',
  locked: 'orange',
  deprecated: 'default',
}
const STATUS_LABELS: Record<string, string> = {
  active: '可用',
  full: '已满',
  locked: '维护中',
  deprecated: '已废弃',
}

const PlatformSpaces: React.FC = () => {
  const [spaces, setSpaces] = useState<Space[]>([])
  const [loading, setLoading] = useState(false)
  const [createVisible, setCreateVisible] = useState(false)
  const [editSpace, setEditSpace] = useState<Space | null>(null)
  const [viewTenantsVisible, setViewTenantsVisible] = useState(false)
  const [selectedSpace, setSelectedSpace] = useState<Space | null>(null)
  const [spaceTenants, setSpaceTenants] = useState<Tenant[]>([])
  const [form] = Form.useForm()
  const [editForm] = Form.useForm()

  const fetch = () => {
    setLoading(true)
    request.get<Space[]>('/admin/spaces')
      .then((r: any) => setSpaces(r.data ?? r))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetch() }, [])

  const handleCreate = async (values: any) => {
    try {
      await request.post('/admin/spaces', values)
      message.success('存储空间创建成功')
      setCreateVisible(false)
      form.resetFields()
      fetch()
    } catch (e: any) {
      message.error(e?.response?.data?.message ?? '创建失败')
    }
  }

  const handleEdit = async (values: any) => {
    if (!editSpace) return
    try {
      await request.patch(`/admin/spaces/${editSpace.spaceId}`, values)
      message.success('更新成功')
      setEditSpace(null)
      fetch()
    } catch {}
  }

  const viewSpaceTenants = async (space: Space) => {
    setSelectedSpace(space)
    try {
      const res: any = await request.get('/admin/tenants', { params: { pageSize: 100 } })
      const tenants = (res.data?.list ?? res.list ?? []).filter((t: Tenant) => t.id)
      // Filter by spaceId - need backend support
      const filtered = tenants // Show all for now, backend can filter
      setSpaceTenants(filtered)
      setViewTenantsVisible(true)
    } catch {}
  }

  const columns = [
    {
      title: '存储空间',
      key: 'name',
      render: (_: any, r: Space) => (
        <div>
          <div style={{ fontWeight: 600 }}>{r.name}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>{r.spaceId}</Text>
        </div>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      render: (v: string) => (
        <Tag color={v === 'shared' ? 'blue' : 'purple'}>
          {v === 'shared' ? '共享' : '专属'}
        </Tag>
      ),
    },
    { title: '地域', dataIndex: 'region' },
    { title: 'DB 实例', dataIndex: 'dbInstance' },
    { title: 'Schema', dataIndex: 'schemaName' },
    {
      title: '租户容量',
      key: 'tenants',
      render: (_: any, r: Space) => (
        <div style={{ minWidth: 120 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={{ fontSize: 12 }}>{r.currentTenants} / {r.maxTenants}</Text>
            <Text style={{ fontSize: 12 }}>{r.maxTenants ? Math.round((r.currentTenants / r.maxTenants) * 100) : 0}%</Text>
          </div>
          <Progress
            percent={r.maxTenants ? Math.round((r.currentTenants / r.maxTenants) * 100) : 0}
            size="small"
            showInfo={false}
            strokeColor={r.currentTenants / r.maxTenants > 0.9 ? '#ff4d4f' : '#1677ff'}
          />
        </div>
      ),
    },
    {
      title: '存储用量',
      key: 'storage',
      render: (_: any, r: Space) => (
        <Text>{r.storageUsedGB.toFixed(1)} / {r.storageLimitGB} GB</Text>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      render: (v: string) => (
        <Tag color={STATUS_COLORS[v] ?? 'default'}>{STATUS_LABELS[v] ?? v}</Tag>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, r: Space) => (
        <Space size="small">
          <Button
            type="link" size="small" icon={<EyeOutlined />}
            onClick={() => viewSpaceTenants(r)}
          >
            租户
          </Button>
          <Button
            type="link" size="small" icon={<EditOutlined />}
            onClick={() => {
              setEditSpace(r)
              editForm.setFieldsValue({ maxTenants: r.maxTenants, status: r.status, notes: r.notes })
            }}
          >
            编辑
          </Button>
        </Space>
      ),
    },
  ]

  const activeSpaces = spaces.filter((s) => s.status === 'active')
  const totalTenants = spaces.reduce((a, s) => a + s.currentTenants, 0)
  const totalCapacity = spaces.reduce((a, s) => a + s.maxTenants, 0)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>存储空间管理</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateVisible(true)}>
          新建存储空间
        </Button>
      </div>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}><Card><Statistic title="存储空间总数" value={spaces.length} /></Card></Col>
        <Col span={6}><Card><Statistic title="可用空间" value={activeSpaces.length} valueStyle={{ color: '#52c41a' }} /></Card></Col>
        <Col span={6}><Card><Statistic title="已接入租户" value={totalTenants} /></Card></Col>
        <Col span={6}><Card><Statistic title="总容量" value={totalCapacity} suffix="个租户位" /></Card></Col>
      </Row>

      <Table
        columns={columns}
        dataSource={spaces}
        rowKey="id"
        loading={loading}
        scroll={{ x: 1000 }}
        pagination={false}
      />

      {/* Create Modal */}
      <Modal
        title="新建存储空间"
        open={createVisible}
        onCancel={() => { setCreateVisible(false); form.resetFields() }}
        footer={null}
        width={580}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate} style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="spaceId" label="Space ID" rules={[{ required: true, pattern: /^[a-z0-9_]+$/, message: '仅小写字母、数字和下划线' }]}>
                <Input placeholder="space_cn_shared_01" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="name" label="名称" rules={[{ required: true }]}>
                <Input placeholder="华东共享池-01" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="type" label="类型" rules={[{ required: true }]} initialValue="shared">
                <Select>
                  <Option value="shared">共享（Shared）</Option>
                  <Option value="dedicated">专属（Dedicated）</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="region" label="地域" initialValue="华东（上海）">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="dbInstance" label="DB 实例" rules={[{ required: true }]}>
                <Input placeholder="db-instance-cn-east-01" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="schemaName" label="Schema 名称" rules={[{ required: true }]}>
                <Input placeholder="space_cn_shared_01" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="maxTenants" label="最大租户数" initialValue={50}>
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="storageLimitGB" label="存储上限 (GB)" initialValue={500}>
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="notes" label="备注">
            <Input.TextArea rows={2} />
          </Form.Item>
          <div style={{ textAlign: 'right' }}>
            <Button onClick={() => setCreateVisible(false)} style={{ marginRight: 8 }}>取消</Button>
            <Button type="primary" htmlType="submit">创建</Button>
          </div>
        </Form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        title={`编辑 — ${editSpace?.name}`}
        open={!!editSpace}
        onCancel={() => setEditSpace(null)}
        footer={null}
      >
        <Form form={editForm} layout="vertical" onFinish={handleEdit} style={{ marginTop: 16 }}>
          <Form.Item name="maxTenants" label="最大租户数">
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select>
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <Option key={k} value={k}>{v}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="notes" label="备注">
            <Input.TextArea rows={2} />
          </Form.Item>
          <div style={{ textAlign: 'right' }}>
            <Button onClick={() => setEditSpace(null)} style={{ marginRight: 8 }}>取消</Button>
            <Button type="primary" htmlType="submit">保存</Button>
          </div>
        </Form>
      </Modal>

      {/* Tenant list drawer */}
      <Drawer
        title={`${selectedSpace?.name} - 租户列表`}
        open={viewTenantsVisible}
        onClose={() => setViewTenantsVisible(false)}
        width={600}
      >
        <Table
          dataSource={spaceTenants}
          rowKey="id"
          size="small"
          pagination={{ pageSize: 10 }}
          columns={[
            { title: '租户名称', dataIndex: 'name' },
            { title: '代码', dataIndex: 'code' },
            { title: 'Slug', dataIndex: 'slug' },
            {
              title: '状态',
              dataIndex: 'lifecycleStatus',
              render: (v: string) => (
                <Tag color={v === 'active' ? 'green' : v === 'trial' ? 'blue' : 'default'}>{v}</Tag>
              ),
            },
            { title: '套餐', dataIndex: 'currentPlanId' },
          ]}
        />
      </Drawer>
    </div>
  )
}

export default PlatformSpaces
