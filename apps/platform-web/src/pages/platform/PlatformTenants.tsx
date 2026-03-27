import React, { useEffect, useState, useCallback } from 'react'
import {
  Table,
  Button,
  Input,
  Select,
  Tag,
  Space,
  Modal,
  Form,
  Drawer,
  Descriptions,
  Popconfirm,
  message,
  Typography,
  Row,
  Col,
  Card,
  Divider,
  Badge,
  Alert,
} from 'antd'
import {
  PlusOutlined,
  SearchOutlined,
  EyeOutlined,
  EditOutlined,
  SwapOutlined,
} from '@ant-design/icons'
import request from '../../utils/request'
import { formatDateTime, formatCurrency } from '../../utils/format'

const { Title, Text } = Typography
const { Option } = Select

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

interface Tenant {
  id: string
  name: string
  code: string
  slug: string | null
  subDomain: string | null
  lifecycleStatus: string
  spaceId: string | null
  currentPlanId: string | null
  trialExpiresAt: string | null
  subscriptionExpiresAt: string | null
  createdAt: string
}

interface TenantDetail {
  tenant: Tenant
  orders: any[]
  domains: any[]
  currentPlan: any | null
}

interface Space {
  id: string
  spaceId: string
  name: string
  type: string
  region: string
  currentTenants: number
  maxTenants: number
  status: string
}

interface Plan {
  id: string
  planId: string
  name: string
  tier: string
}

const PlatformTenants: React.FC = () => {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | undefined>()
  const [detailTenant, setDetailTenant] = useState<TenantDetail | null>(null)
  const [detailVisible, setDetailVisible] = useState(false)
  const [createVisible, setCreateVisible] = useState(false)
  const [lifecycleVisible, setLifecycleVisible] = useState(false)
  const [spaceVisible, setSpaceVisible] = useState(false)
  const [planVisible, setPlanVisible] = useState(false)
  const [migrateVisible, setMigrateVisible] = useState(false)
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null)
  const [spaces, setSpaces] = useState<Space[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [form] = Form.useForm()
  const [lifecycleForm] = Form.useForm()
  const [spaceForm] = Form.useForm()
  const [planForm] = Form.useForm()

  const fetchTenants = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, any> = { page, pageSize: 20 }
      if (search) params.search = search
      if (statusFilter) params.lifecycleStatus = statusFilter
      const res: any = await request.get('/admin/tenants', { params })
      const data = res.data ?? res
      setTenants(data.list ?? [])
      setTotal(data.total ?? 0)
    } catch {}
    setLoading(false)
  }, [page, search, statusFilter])

  useEffect(() => { fetchTenants() }, [fetchTenants])
  useEffect(() => {
    request.get<Space[]>('/admin/spaces/available').then((r: any) => setSpaces(r.data ?? r)).catch(() => {})
    request.get<Plan[]>('/admin/plans').then((r: any) => setPlans(r.data ?? r)).catch(() => {})
  }, [])

  const openDetail = async (id: string) => {
    try {
      const res: any = await request.get(`/admin/tenants/${id}`)
      setDetailTenant(res.data ?? res)
      setDetailVisible(true)
    } catch {}
  }

  const handleCreate = async (values: any) => {
    try {
      await request.post('/admin/tenants', values)
      message.success('租户创建成功')
      setCreateVisible(false)
      form.resetFields()
      fetchTenants()
    } catch (e: any) {
      message.error(e?.response?.data?.message ?? '创建失败')
    }
  }

  const handleLifecycle = async (values: any) => {
    if (!selectedTenant) return
    try {
      await request.patch(`/admin/tenants/${selectedTenant.id}/lifecycle`, values)
      message.success('状态更新成功')
      setLifecycleVisible(false)
      fetchTenants()
    } catch {}
  }

  const handleSpaceUpdate = async (values: any) => {
    if (!selectedTenant) return
    try {
      await request.patch(`/admin/tenants/${selectedTenant.id}/space`, values)
      message.success('存储空间更新成功')
      setSpaceVisible(false)
      fetchTenants()
    } catch (e: any) {
      message.error(e?.response?.data?.message ?? '更新失败')
    }
  }

  const handlePlanChange = async (values: any) => {
    if (!selectedTenant) return
    try {
      await request.patch(`/admin/tenants/${selectedTenant.id}/plan`, values)
      message.success('套餐变更成功')
      setPlanVisible(false)
      fetchTenants()
      if (detailTenant) openDetail(selectedTenant.id)
    } catch (e: any) {
      message.error(e?.response?.data?.message ?? '变更失败')
    }
  }

  const handleMigrate = async (values: any) => {
    if (!selectedTenant) return
    try {
      await request.post(`/admin/tenants/${selectedTenant.id}/migrate`, values)
      message.success('迁移成功')
      setMigrateVisible(false)
      fetchTenants()
    } catch (e: any) {
      message.error(e?.response?.data?.message ?? '迁移失败')
    }
  }

  const columns = [
    { title: '租户名称', dataIndex: 'name', key: 'name', width: 160 },
    { title: '代码', dataIndex: 'code', key: 'code', width: 100 },
    {
      title: 'Slug / 子域名',
      key: 'slug',
      render: (_: any, r: Tenant) => (
        <div>
          <div style={{ fontWeight: 500 }}>{r.slug ?? '-'}</div>
          {r.subDomain && <Text type="secondary" style={{ fontSize: 12 }}>{r.subDomain}</Text>}
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'lifecycleStatus',
      key: 'lifecycleStatus',
      render: (v: string) => (
        <Tag color={LIFECYCLE_COLORS[v] ?? 'default'}>{LIFECYCLE_LABELS[v] ?? v}</Tag>
      ),
    },
    {
      title: '存储空间',
      dataIndex: 'spaceId',
      key: 'spaceId',
      width: 140,
      render: (v: string) => v ? <Tag color="blue">{v}</Tag> : <Tag color="red">未分配</Tag>,
    },
    { title: '套餐', dataIndex: 'currentPlanId', key: 'currentPlanId', width: 110 },
    {
      title: '到期时间',
      key: 'expiry',
      render: (_: any, r: Tenant) => {
        const date = r.subscriptionExpiresAt ?? r.trialExpiresAt
        return date ? formatDateTime(date).slice(0, 10) : '-'
      },
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (v: string) => formatDateTime(v).slice(0, 10),
    },
    {
      title: '操作',
      key: 'actions',
      fixed: 'right' as const,
      width: 180,
      render: (_: any, r: Tenant) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => openDetail(r.id)}>
            详情
          </Button>
          <Button
            type="link"
            size="small"
            onClick={() => {
              setSelectedTenant(r)
              planForm.setFieldsValue({ planId: r.currentPlanId, changeType: 'renewal', billingCycle: 'yearly' })
              setPlanVisible(true)
            }}
          >
            套餐
          </Button>
          <Button
            type="link"
            size="small"
            onClick={() => {
              setSelectedTenant(r)
              lifecycleForm.setFieldValue('lifecycleStatus', r.lifecycleStatus)
              setLifecycleVisible(true)
            }}
          >
            状态
          </Button>
          <Button
            type="link"
            size="small"
            onClick={() => {
              setSelectedTenant(r)
              spaceForm.setFieldValue('spaceId', r.spaceId || undefined)
              setSpaceVisible(true)
            }}
          >
            空间
          </Button>
          <Button
            type="link"
            size="small"
            icon={<SwapOutlined />}
            onClick={() => {
              setSelectedTenant(r)
              setMigrateVisible(true)
            }}
          >
            迁移
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>租户管理</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateVisible(true)}>
          开通租户
        </Button>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={12}>
          <Col flex="1">
            <Input
              placeholder="搜索租户名称、代码或 Slug"
              prefix={<SearchOutlined />}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              allowClear
            />
          </Col>
          <Col>
            <Select
              placeholder="全部状态"
              style={{ width: 140 }}
              allowClear
              value={statusFilter}
              onChange={(v) => { setStatusFilter(v); setPage(1) }}
            >
              {Object.entries(LIFECYCLE_LABELS).map(([k, v]) => (
                <Option key={k} value={k}>{v}</Option>
              ))}
            </Select>
          </Col>
        </Row>
      </Card>

      <Table
        columns={columns}
        dataSource={tenants}
        rowKey="id"
        loading={loading}
        scroll={{ x: 900 }}
        pagination={{
          current: page,
          pageSize: 20,
          total,
          onChange: setPage,
          showTotal: (t) => `共 ${t} 个租户`,
        }}
      />

      {/* Create tenant modal */}
      <Modal
        title="开通新租户"
        open={createVisible}
        onCancel={() => { setCreateVisible(false); form.resetFields() }}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate} style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="name" label="租户名称" rules={[{ required: true }]}>
                <Input placeholder="如：星河资产管理有限公司" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="code" label="租户代码" rules={[{ required: true, pattern: /^[A-Z0-9]+$/, message: '仅大写字母和数字' }]}>
                <Input placeholder="如：XINGHE" style={{ textTransform: 'uppercase' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="slug"
                label="Slug（子域名标识）"
                rules={[{ required: true, pattern: /^[a-z0-9-]{3,20}$/, message: '3-20位小写字母、数字或连字符' }]}
                extra="将生成 {slug}.mdos.com 子域名"
              >
                <Input placeholder="如：xinghe" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="spaceId" label="存储空间" rules={[{ required: true }]}>
                <Select placeholder="选择存储空间">
                  {spaces.map((s) => (
                    <Option key={s.spaceId} value={s.spaceId}>
                      {s.name} [{s.type === 'shared' ? '共享' : '专属'}] {s.currentTenants}/{s.maxTenants}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="planId" label="订阅套餐" rules={[{ required: true }]}>
                <Select placeholder="选择套餐">
                  {plans.map((p) => (
                    <Option key={p.planId} value={p.planId}>{p.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="adminEmail" label="管理员邮箱" rules={[{ required: true, type: 'email' }]}>
                <Input placeholder="admin@example.com" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="adminPassword" label="管理员初始密码" rules={[{ required: true, min: 8 }]}>
            <Input.Password placeholder="至少8位" />
          </Form.Item>
          <div style={{ textAlign: 'right' }}>
            <Button onClick={() => setCreateVisible(false)} style={{ marginRight: 8 }}>取消</Button>
            <Button type="primary" htmlType="submit">创建租户</Button>
          </div>
        </Form>
      </Modal>

      {/* Lifecycle status modal */}
      <Modal
        title={`变更租户状态 — ${selectedTenant?.name}`}
        open={lifecycleVisible}
        onCancel={() => setLifecycleVisible(false)}
        footer={null}
      >
        <Form form={lifecycleForm} layout="vertical" onFinish={handleLifecycle} style={{ marginTop: 16 }}>
          <Form.Item name="lifecycleStatus" label="生命周期状态" rules={[{ required: true }]}>
            <Select>
              {Object.entries(LIFECYCLE_LABELS).map(([k, v]) => (
                <Option key={k} value={k}>{v}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="notes" label="备注">
            <Input.TextArea rows={2} placeholder="操作原因（可选）" />
          </Form.Item>
          <div style={{ textAlign: 'right' }}>
            <Button onClick={() => setLifecycleVisible(false)} style={{ marginRight: 8 }}>取消</Button>
            <Button type="primary" htmlType="submit">确认更新</Button>
          </div>
        </Form>
      </Modal>

      {/* Space assignment modal */}
      <Modal
        title={`分配存储空间 — ${selectedTenant?.name}`}
        open={spaceVisible}
        onCancel={() => setSpaceVisible(false)}
        footer={null}
      >
        <Form form={spaceForm} layout="vertical" onFinish={handleSpaceUpdate} style={{ marginTop: 16 }}>
          <Form.Item name="spaceId" label="存储空间" rules={[{ required: true, message: '请选择存储空间' }]}>
            <Select placeholder="选择存储空间">
              {spaces.map((s) => (
                <Option key={s.spaceId} value={s.spaceId}>
                  {s.name} ({s.type}) - {s.currentTenants}/{s.maxTenants} 租户
                </Option>
              ))}
            </Select>
          </Form.Item>
          <div style={{ textAlign: 'right' }}>
            <Button onClick={() => setSpaceVisible(false)} style={{ marginRight: 8 }}>取消</Button>
            <Button type="primary" htmlType="submit">确认分配</Button>
          </div>
        </Form>
      </Modal>

      {/* Plan change modal */}
      <Modal
        title={`变更套餐 — ${selectedTenant?.name}`}
        open={planVisible}
        onCancel={() => setPlanVisible(false)}
        footer={null}
      >
        <Form form={planForm} layout="vertical" onFinish={handlePlanChange} style={{ marginTop: 16 }}>
          <Form.Item name="planId" label="目标套餐" rules={[{ required: true, message: '请选择套餐' }]}>
            <Select placeholder="选择套餐">
              {plans.map((p) => (
                <Option key={p.planId} value={p.planId}>
                  {p.name} ({p.tier})
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="changeType" label="变更类型" rules={[{ required: true }]}>
            <Select>
              <Option value="renewal">续费</Option>
              <Option value="upgrade">升级</Option>
              <Option value="downgrade">降级</Option>
            </Select>
          </Form.Item>
          <Form.Item name="billingCycle" label="计费周期" rules={[{ required: true }]}>
            <Select>
              <Option value="monthly">月付</Option>
              <Option value="yearly">年付</Option>
            </Select>
          </Form.Item>
          <Form.Item name="notes" label="备注">
            <Input.TextArea rows={2} placeholder="变更原因（可选）" />
          </Form.Item>
          <div style={{ textAlign: 'right' }}>
            <Button onClick={() => setPlanVisible(false)} style={{ marginRight: 8 }}>取消</Button>
            <Button type="primary" htmlType="submit">确认变更</Button>
          </div>
        </Form>
      </Modal>

      {/* Migration modal */}
      <Modal
        title={`迁移租户 — ${selectedTenant?.name}`}
        open={migrateVisible}
        onCancel={() => setMigrateVisible(false)}
        footer={null}
      >
        <Form layout="vertical" onFinish={handleMigrate} style={{ marginTop: 16 }}>
          <Form.Item name="targetSpaceId" label="目标存储空间" rules={[{ required: true, message: '请选择目标空间' }]}>
            <Select placeholder="选择目标存储空间">
              {spaces.filter(s => s.status === 'active').map((s) => (
                <Option key={s.spaceId} value={s.spaceId}>
                  {s.name} ({s.type}) - 可用
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="notes" label="迁移备注">
            <Input.TextArea rows={2} placeholder="迁移原因（可选）" />
          </Form.Item>
          <Alert
            message="注意"
            description="迁移将更新租户的存储空间指向，数据不会自动迁移。"
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
          <div style={{ textAlign: 'right' }}>
            <Button onClick={() => setMigrateVisible(false)} style={{ marginRight: 8 }}>取消</Button>
            <Button type="primary" htmlType="submit">确认迁移</Button>
          </div>
        </Form>
      </Modal>

      {/* Tenant detail drawer */}
      <Drawer
        title={detailTenant?.tenant?.name ?? '租户详情'}
        open={detailVisible}
        onClose={() => setDetailVisible(false)}
        width={680}
      >
        {detailTenant && (
          <>
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="租户代码">{detailTenant.tenant?.code}</Descriptions.Item>
              <Descriptions.Item label="Slug">{detailTenant.tenant?.slug ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="子域名">{detailTenant.tenant?.subDomain ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="存储空间">{detailTenant.tenant?.spaceId ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={LIFECYCLE_COLORS[detailTenant.tenant?.lifecycleStatus] ?? 'default'}>
                  {LIFECYCLE_LABELS[detailTenant.tenant?.lifecycleStatus] ?? detailTenant.tenant?.lifecycleStatus}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="当前套餐">{detailTenant.currentPlan?.name ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="试用到期">{detailTenant.tenant?.trialExpiresAt ? formatDateTime(detailTenant.tenant.trialExpiresAt).slice(0, 10) : '-'}</Descriptions.Item>
              <Descriptions.Item label="订阅到期">{detailTenant.tenant?.subscriptionExpiresAt ? formatDateTime(detailTenant.tenant.subscriptionExpiresAt).slice(0, 10) : '-'}</Descriptions.Item>
              <Descriptions.Item label="创建时间" span={2}>{formatDateTime(detailTenant.tenant?.createdAt)}</Descriptions.Item>
            </Descriptions>

            <Divider orientation="left">域名列表</Divider>
            <Table
              dataSource={detailTenant.domains}
              rowKey="id"
              size="small"
              pagination={false}
              columns={[
                { title: '域名', dataIndex: 'domain' },
                { title: '类型', dataIndex: 'type', render: (v: string) => v === 'subdomain' ? '子域名' : '自定义' },
                { title: '状态', dataIndex: 'status', render: (v: string) => <Tag>{v}</Tag> },
                { title: 'SSL', dataIndex: 'sslStatus', render: (v: string) => <Tag color={v === 'active' ? 'green' : 'orange'}>{v}</Tag> },
              ]}
            />

            <Divider orientation="left">订阅订单</Divider>
            <Table
              dataSource={detailTenant.orders}
              rowKey="id"
              size="small"
              pagination={{ pageSize: 5 }}
              columns={[
                { title: '订单号', dataIndex: 'orderId', width: 180 },
                { title: '套餐', dataIndex: 'planId' },
                { title: '金额', dataIndex: 'amount', render: (v: number) => formatCurrency(v) },
                {
                  title: '状态',
                  dataIndex: 'paymentStatus',
                  render: (v: string) => (
                    <Tag color={v === 'paid' ? 'green' : v === 'pending' ? 'orange' : 'default'}>
                      {{ paid: '已支付', pending: '待支付', cancelled: '已取消', refunded: '已退款' }[v] ?? v}
                    </Tag>
                  ),
                },
                { title: '时间', dataIndex: 'createdAt', render: (v: string) => formatDateTime(v).slice(0, 10) },
              ]}
            />
          </>
        )}
      </Drawer>
    </div>
  )
}

export default PlatformTenants
