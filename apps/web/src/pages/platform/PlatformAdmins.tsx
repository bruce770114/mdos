import React, { useEffect, useState } from 'react'
import {
  Table, Button, Modal, Form, Input, Tag, message, Card, Typography, Space, Popconfirm,
} from 'antd'
import { PlusOutlined, DeleteOutlined, KeyOutlined } from '@ant-design/icons'
import request from '../../utils/request'
import { formatDateTime } from '../../utils/format'

const { Title } = Typography

interface PlatformAdmin {
  id: string
  username: string
  email: string
  phone: string | null
  status: string
  isPlatformAdmin: boolean
  lastLoginAt: string | null
  createdAt: string
}

const PlatformAdmins: React.FC = () => {
  const [admins, setAdmins] = useState<PlatformAdmin[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [createVisible, setCreateVisible] = useState(false)
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [selectedAdmin, setSelectedAdmin] = useState<PlatformAdmin | null>(null)
  const [form] = Form.useForm()
  const [passwordForm] = Form.useForm()

  const fetchAdmins = () => {
    setLoading(true)
    request.get('/admin/admins', { params: { page, pageSize: 20 } })
      .then((r: any) => {
        const res = r.data ?? r
        setAdmins(res.list ?? [])
        setTotal(res.total ?? 0)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchAdmins() }, [page])

  const handleCreate = async (values: any) => {
    try {
      await request.post('/admin/admins', values)
      message.success('创建成功')
      setCreateVisible(false)
      form.resetFields()
      fetchAdmins()
    } catch (e: any) {
      message.error(e?.response?.data?.message ?? '创建失败')
    }
  }

  const handleResetPassword = async (values: any) => {
    if (!selectedAdmin) return
    try {
      await request.post(`/admin/admins/${selectedAdmin.id}/reset-password`, { newPassword: values.newPassword })
      message.success('密码重置成功')
      setPasswordVisible(false)
      passwordForm.resetFields()
    } catch (e: any) {
      message.error(e?.response?.data?.message ?? '重置失败')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await request.delete(`/admin/admins/${id}`)
      message.success('删除成功')
      fetchAdmins()
    } catch (e: any) {
      message.error(e?.response?.data?.message ?? '删除失败')
    }
  }

  const columns = [
    { title: '用户名', dataIndex: 'username', width: 150 },
    { title: '邮箱', dataIndex: 'email', width: 200 },
    { title: '手机', dataIndex: 'phone', width: 150, render: (v: string) => v || '-' },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (v: string) => (
        <Tag color={v === 'active' ? 'green' : 'red'}>{v === 'active' ? '正常' : '禁用'}</Tag>
      ),
    },
    { title: '最后登录', dataIndex: 'lastLoginAt', width: 180, render: (v: string) => v ? formatDateTime(v).slice(0, 16) : '-' },
    { title: '创建时间', dataIndex: 'createdAt', width: 180, render: (v: string) => v?.slice(0, 10) },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      render: (_: any, r: PlatformAdmin) => (
        <Space size="small">
          <Button
            type="link" size="small" icon={<KeyOutlined />}
            onClick={() => { setSelectedAdmin(r); setPasswordVisible(true) }}
          >
            重置密码
          </Button>
          <Popconfirm title="确认删除此管理员？" onConfirm={() => handleDelete(r.id)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>平台管理员</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateVisible(true)}>
          添加管理员
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={admins}
        rowKey="id"
        loading={loading}
        pagination={{
          current: page,
          pageSize: 20,
          total,
          onChange: setPage,
          showTotal: (t) => `共 ${t} 个管理员`,
        }}
      />

      {/* Create Modal */}
      <Modal
        title="添加平台管理员"
        open={createVisible}
        onCancel={() => { setCreateVisible(false); form.resetFields() }}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate} style={{ marginTop: 16 }}>
          <Form.Item name="username" label="用户名" rules={[{ required: true }]}>
            <Input placeholder="请输入用户名" />
          </Form.Item>
          <Form.Item name="email" label="邮箱" rules={[{ required: true, type: 'email' }]}>
            <Input placeholder="admin@example.com" />
          </Form.Item>
          <Form.Item name="phone" label="手机号">
            <Input placeholder="可选" />
          </Form.Item>
          <Form.Item name="password" label="初始密码" rules={[{ required: true, min: 8 }]}>
            <Input.Password placeholder="至少8位" />
          </Form.Item>
          <div style={{ textAlign: 'right' }}>
            <Button onClick={() => setCreateVisible(false)} style={{ marginRight: 8 }}>取消</Button>
            <Button type="primary" htmlType="submit">创建</Button>
          </div>
        </Form>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        title={`重置密码 — ${selectedAdmin?.username}`}
        open={passwordVisible}
        onCancel={() => { setPasswordVisible(false); passwordForm.resetFields() }}
        footer={null}
      >
        <Form form={passwordForm} layout="vertical" onFinish={handleResetPassword} style={{ marginTop: 16 }}>
          <Form.Item name="newPassword" label="新密码" rules={[{ required: true, min: 8 }]}>
            <Input.Password placeholder="至少8位" />
          </Form.Item>
          <div style={{ textAlign: 'right' }}>
            <Button onClick={() => setPasswordVisible(false)} style={{ marginRight: 8 }}>取消</Button>
            <Button type="primary" htmlType="submit">重置</Button>
          </div>
        </Form>
      </Modal>
    </div>
  )
}

export default PlatformAdmins
