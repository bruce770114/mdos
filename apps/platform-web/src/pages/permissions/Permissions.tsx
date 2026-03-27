import React, { useState, useEffect, useCallback } from 'react'
import {
  Tabs,
  Table,
  Tag,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  Space,
  Popconfirm,
  Badge,
  Tree,
  Checkbox,
  message,
  Spin,
  Alert,
  Tooltip,
  Typography,
} from 'antd'
import type { TableColumnsType } from 'antd'
import type { DataNode } from 'antd/es/tree'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  LockOutlined,
  KeyOutlined,
  UserOutlined,
} from '@ant-design/icons'
import request from '@/utils/request'
import PageHeader from '@/components/PageHeader'
import { formatDateTime } from '@/utils/format'
import type { Role, Permission } from '@/types'

const { Text } = Typography

// ---------------------------------------------------------------------------
// Constants – module and action metadata
// ---------------------------------------------------------------------------

const MODULE_LABELS: Record<string, string> = {
  users: '用户管理',
  roles: '角色管理',
  units: '租赁单元',
  customers: '客户管理',
  contracts: '合同管理',
  billing: '账务管理',
  financial: '财务管理',
  settings: '系统设置',
}

const ACTION_LABELS: Record<string, string> = {
  read: '查看',
  create: '新增',
  update: '修改',
  delete: '删除',
  approve: '审批',
  export: '导出',
}

// ---------------------------------------------------------------------------
// Extra types (not imported from @/types to keep component self-contained)
// ---------------------------------------------------------------------------

interface RoleWithStats extends Role {
  permissionCount: number
  isSystem: boolean
}

interface UserRecord {
  id: string
  username: string
  email: string
  phone?: string
  roles: Role[]
  enabled: boolean
  lastLoginAt?: string
  createdAt: string
}

// ---------------------------------------------------------------------------
// Permission tree helpers
// ---------------------------------------------------------------------------

function buildPermissionTree(permissions: Permission[], selected: string[]): DataNode[] {
  const byModule: Record<string, Permission[]> = {}
  for (const p of permissions) {
    const [module] = p.code.split(':')
    if (!byModule[module]) byModule[module] = []
    byModule[module].push(p)
  }

  return Object.entries(byModule).map(([module, perms]) => ({
    key: `module:${module}`,
    title: (
      <Text strong style={{ fontSize: 13 }}>
        {MODULE_LABELS[module] ?? module}
      </Text>
    ),
    children: perms.map((p) => {
      const [, action] = p.code.split(':')
      return {
        key: p.id,
        title: (
          <span style={{ fontSize: 13 }}>
            <Tag color="blue" style={{ fontSize: 11, margin: 0 }}>
              {ACTION_LABELS[action] ?? action}
            </Tag>
          </span>
        ),
      }
    }),
  }))
}

// ---------------------------------------------------------------------------
// Role permissions modal
// ---------------------------------------------------------------------------

interface RolePermissionsModalProps {
  role: RoleWithStats | null
  visible: boolean
  onClose: () => void
  onSaved: () => void
}

const RolePermissionsModal: React.FC<RolePermissionsModalProps> = ({
  role,
  visible,
  onClose,
  onSaved,
}) => {
  const [allPermissions, setAllPermissions] = useState<Permission[]>([])
  const [checkedKeys, setCheckedKeys] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!visible || !role) return
    setLoading(true)
    Promise.all([
      request.get<Permission[]>('/permissions'),
      request.get<string[]>(`/roles/${role.id}/permissions`),
    ])
      .then(([allRes, selectedRes]) => {
        setAllPermissions(allRes.data)
        setCheckedKeys(selectedRes.data)
      })
      .catch(() => message.error('加载权限数据失败'))
      .finally(() => setLoading(false))
  }, [visible, role])

  const handleSave = async () => {
    if (!role) return
    setSaving(true)
    try {
      await request.put(`/roles/${role.id}/permissions`, { permissionIds: checkedKeys })
      message.success('权限已保存')
      onSaved()
      onClose()
    } catch {
      message.error('保存权限失败')
    } finally {
      setSaving(false)
    }
  }

  const treeData = buildPermissionTree(allPermissions, checkedKeys)

  return (
    <Modal
      title={
        <Space>
          <KeyOutlined />
          编辑角色权限 — {role?.name}
        </Space>
      }
      open={visible}
      onCancel={onClose}
      width={520}
      footer={[
        <Button key="cancel" onClick={onClose}>
          取消
        </Button>,
        <Button
          key="save"
          type="primary"
          loading={saving}
          onClick={handleSave}
          disabled={role?.isSystem}
        >
          保存
        </Button>,
      ]}
    >
      {role?.isSystem && (
        <Alert
          type="warning"
          message="系统角色权限不可修改"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin />
        </div>
      ) : (
        <Tree
          checkable
          checkedKeys={checkedKeys}
          onCheck={(keys) => setCheckedKeys(keys as string[])}
          treeData={treeData}
          defaultExpandAll
          disabled={role?.isSystem}
          style={{ maxHeight: 400, overflowY: 'auto' }}
        />
      )}
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Role management tab
// ---------------------------------------------------------------------------

const RoleManagement: React.FC = () => {
  const [roles, setRoles] = useState<RoleWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [permModalRole, setPermModalRole] = useState<RoleWithStats | null>(null)
  const [permModalVisible, setPermModalVisible] = useState(false)

  const fetchRoles = useCallback(() => {
    setLoading(true)
    request
      .get<RoleWithStats[]>('/roles')
      .then((res) => setRoles(res.data))
      .catch(() => message.error('加载角色列表失败'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchRoles()
  }, [fetchRoles])

  const handleDeleteRole = async (id: string) => {
    try {
      await request.delete(`/roles/${id}`)
      message.success('角色已删除')
      fetchRoles()
    } catch {
      message.error('删除角色失败')
    }
  }

  const columns: TableColumnsType<RoleWithStats> = [
    {
      title: '角色名称',
      dataIndex: 'name',
      render: (name: string, record) => (
        <Space>
          <Text strong>{name}</Text>
          {record.isSystem && <Tag color="gold">系统角色</Tag>}
        </Space>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      ellipsis: true,
      render: (desc: string) => <Text type="secondary">{desc || '—'}</Text>,
    },
    {
      title: '权限数量',
      dataIndex: 'permissionCount',
      width: 100,
      align: 'center',
      render: (count: number) => (
        <Badge
          count={count}
          showZero
          style={{ backgroundColor: count > 0 ? '#1677ff' : '#d9d9d9' }}
        />
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 180,
      align: 'center',
      render: (_, record) => (
        <Space size={8}>
          <Tooltip title="编辑权限">
            <Button
              size="small"
              icon={<KeyOutlined />}
              onClick={() => {
                setPermModalRole(record)
                setPermModalVisible(true)
              }}
            >
              权限设置
            </Button>
          </Tooltip>
          <Popconfirm
            title="确认删除该角色？"
            description="删除后无法恢复，请谨慎操作。"
            onConfirm={() => handleDeleteRole(record.id)}
            disabled={record.isSystem}
          >
            <Tooltip title={record.isSystem ? '系统角色不可删除' : '删除角色'}>
              <Button
                size="small"
                danger
                icon={<DeleteOutlined />}
                disabled={record.isSystem}
              >
                删除
              </Button>
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={roles}
        loading={loading}
        pagination={{ pageSize: 15, showSizeChanger: false }}
        size="middle"
        style={{ background: '#fff', borderRadius: 8 }}
      />

      <RolePermissionsModal
        role={permModalRole}
        visible={permModalVisible}
        onClose={() => setPermModalVisible(false)}
        onSaved={fetchRoles}
      />
    </>
  )
}

// ---------------------------------------------------------------------------
// User form modal
// ---------------------------------------------------------------------------

interface UserFormValues {
  username: string
  email: string
  phone?: string
  password?: string
  roleIds: string[]
}

interface UserFormModalProps {
  visible: boolean
  editUser: UserRecord | null
  roles: RoleWithStats[]
  onClose: () => void
  onSaved: () => void
}

const UserFormModal: React.FC<UserFormModalProps> = ({
  visible,
  editUser,
  roles,
  onClose,
  onSaved,
}) => {
  const [form] = Form.useForm<UserFormValues>()
  const [saving, setSaving] = useState(false)
  const isEdit = !!editUser

  useEffect(() => {
    if (visible) {
      if (editUser) {
        form.setFieldsValue({
          username: editUser.username,
          email: editUser.email,
          phone: editUser.phone,
          roleIds: editUser.roles.map((r) => r.id),
          password: undefined,
        })
      } else {
        form.resetFields()
      }
    }
  }, [visible, editUser, form])

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      setSaving(true)
      if (isEdit && editUser) {
        const payload: Partial<UserFormValues> = { ...values }
        if (!payload.password) delete payload.password
        await request.put(`/users/${editUser.id}`, payload)
        message.success('用户已更新')
      } else {
        await request.post('/users', values)
        message.success('用户已创建')
      }
      onSaved()
      onClose()
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'errorFields' in err) return // validation error
      message.error(isEdit ? '更新用户失败' : '创建用户失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={
        <Space>
          <UserOutlined />
          {isEdit ? '编辑用户' : '新增用户'}
        </Space>
      }
      open={visible}
      onCancel={onClose}
      onOk={handleSubmit}
      okText={isEdit ? '保存' : '创建'}
      confirmLoading={saving}
      width={480}
      destroyOnClose
    >
      <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
        <Form.Item
          name="username"
          label="用户名"
          rules={[
            { required: true, message: '请输入用户名' },
            { min: 2, message: '用户名至少 2 个字符' },
          ]}
        >
          <Input placeholder="请输入用户名" prefix={<UserOutlined />} />
        </Form.Item>

        <Form.Item
          name="email"
          label="邮箱"
          rules={[
            { required: true, message: '请输入邮箱' },
            { type: 'email', message: '请输入有效的邮箱地址' },
          ]}
        >
          <Input placeholder="请输入邮箱" />
        </Form.Item>

        <Form.Item
          name="phone"
          label="手机号"
          rules={[{ pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号码' }]}
        >
          <Input placeholder="请输入手机号（可选）" />
        </Form.Item>

        <Form.Item
          name="password"
          label={isEdit ? '密码（留空则不修改）' : '密码'}
          rules={isEdit ? [] : [
            { required: true, message: '请输入密码' },
            { min: 8, message: '密码至少 8 个字符' },
          ]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder={isEdit ? '不修改请留空' : '请输入密码（至少 8 位）'}
          />
        </Form.Item>

        <Form.Item
          name="roleIds"
          label="角色"
          rules={[{ required: true, message: '请至少选择一个角色' }]}
        >
          <Select
            mode="multiple"
            placeholder="请选择角色（可多选）"
            options={roles.map((r) => ({ label: r.name, value: r.id }))}
            optionFilterProp="label"
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// User management tab
// ---------------------------------------------------------------------------

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<UserRecord[]>([])
  const [roles, setRoles] = useState<RoleWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [modalVisible, setModalVisible] = useState(false)
  const [editUser, setEditUser] = useState<UserRecord | null>(null)

  const fetchData = useCallback(() => {
    setLoading(true)
    Promise.all([request.get<UserRecord[]>('/users'), request.get<RoleWithStats[]>('/roles')])
      .then(([usersRes, rolesRes]) => {
        setUsers(usersRes.data)
        setRoles(rolesRes.data)
      })
      .catch(() => message.error('加载用户数据失败'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleToggleEnabled = async (user: UserRecord) => {
    try {
      await request.patch(`/users/${user.id}/status`, { enabled: !user.enabled })
      message.success(user.enabled ? '用户已禁用' : '用户已启用')
      fetchData()
    } catch {
      message.error('操作失败')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await request.delete(`/users/${id}`)
      message.success('用户已删除')
      fetchData()
    } catch {
      message.error('删除用户失败')
    }
  }

  const columns: TableColumnsType<UserRecord> = [
    {
      title: '用户名',
      dataIndex: 'username',
      render: (name: string) => <Text strong>{name}</Text>,
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      ellipsis: true,
    },
    {
      title: '手机',
      dataIndex: 'phone',
      render: (phone?: string) => <Text type="secondary">{phone || '—'}</Text>,
    },
    {
      title: '角色',
      dataIndex: 'roles',
      render: (roles: Role[]) => (
        <Space size={4} wrap>
          {roles.map((r) => (
            <Tag key={r.id} color="blue" style={{ margin: 0 }}>
              {r.name}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      width: 90,
      align: 'center',
      render: (enabled: boolean) =>
        enabled ? (
          <Badge status="success" text="启用" />
        ) : (
          <Badge status="default" text="禁用" />
        ),
    },
    {
      title: '最后登录',
      dataIndex: 'lastLoginAt',
      width: 160,
      render: (v?: string) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {v ? formatDateTime(v) : '从未登录'}
        </Text>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      align: 'center',
      render: (_, record) => (
        <Space size={6}>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              setEditUser(record)
              setModalVisible(true)
            }}
          >
            编辑
          </Button>
          <Button
            size="small"
            onClick={() => handleToggleEnabled(record)}
          >
            {record.enabled ? '禁用' : '启用'}
          </Button>
          <Popconfirm
            title="确认删除该用户？"
            onConfirm={() => handleDelete(record.id)}
          >
            <Button size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditUser(null)
            setModalVisible(true)
          }}
        >
          新增用户
        </Button>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={users}
        loading={loading}
        pagination={{ pageSize: 15, showSizeChanger: true, showTotal: (t) => `共 ${t} 条` }}
        size="middle"
        style={{ background: '#fff', borderRadius: 8 }}
      />

      <UserFormModal
        visible={modalVisible}
        editUser={editUser}
        roles={roles}
        onClose={() => setModalVisible(false)}
        onSaved={fetchData}
      />
    </>
  )
}

// ---------------------------------------------------------------------------
// Root Permissions page
// ---------------------------------------------------------------------------

const Permissions: React.FC = () => {
  const tabItems = [
    {
      key: 'roles',
      label: (
        <Space>
          <KeyOutlined />
          角色管理
        </Space>
      ),
      children: <RoleManagement />,
    },
    {
      key: 'users',
      label: (
        <Space>
          <UserOutlined />
          用户管理
        </Space>
      ),
      children: <UserManagement />,
    },
  ]

  return (
    <div style={{ padding: 24, background: '#f5f5f5', minHeight: '100vh' }}>
      <PageHeader
        title="权限管理"
        subtitle="管理系统角色及用户账号权限"
        breadcrumbs={[{ title: '系统管理' }, { title: '权限管理' }]}
      />
      <div style={{ background: '#fff', borderRadius: 10, padding: '16px 20px' }}>
        <Tabs defaultActiveKey="roles" items={tabItems} />
      </div>
    </div>
  )
}

export default Permissions
