import React, { useState } from 'react'
import { Form, Input, Button, Card, message, Typography, Divider, Space, theme } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { Link, useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import request from '../../utils/request'
import { setCredentials } from '../../store/slices/authSlice'
import type { ApiResponse } from '../../utils/request'

const { Title, Text, Paragraph } = Typography
const { useToken } = theme

interface AdminLoginFormValues {
  username: string
  password: string
}

interface LoginResponseData {
  accessToken: string
  refreshToken: string
  user: {
    id: string
    username: string
    email: string
    tenantId: string
    isPlatformAdmin: boolean
  }
}

const AdminLogin: React.FC = () => {
  const [form] = Form.useForm<AdminLoginFormValues>()
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { token } = useToken()

  const handleSubmit = async (values: AdminLoginFormValues) => {
    setLoading(true)
    try {
      const res = await request.post<unknown, ApiResponse<LoginResponseData>>('/auth/admin-login', {
        username: values.username,
        password: values.password,
      })

      const data = res.data
      if (data?.accessToken) {
        dispatch(setCredentials({
          user: data.user,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
        }))
        message.success('登录成功')
        navigate('/admin/dashboard')
      }
    } catch (err: any) {
      const errMsg = err?.response?.data?.message ?? '登录失败，请检查用户名和密码'
      message.error(errMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px',
    }}>
      <Card
        style={{
          width: 400,
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          borderRadius: 12,
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: 12,
            background: 'linear-gradient(135deg, #722ed1 0%, #1677ff 100%)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
          }}>
            <span style={{ color: '#fff', fontSize: 24, fontWeight: 700 }}>P</span>
          </div>
          <Title level={3} style={{ marginBottom: 4 }}>平台管控台</Title>
          <Text type="secondary">SaaS 运营管理后台</Text>
        </div>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          autoComplete="off"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="用户名"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="密码"
              size="large"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              loading={loading}
              style={{
                background: 'linear-gradient(135deg, #722ed1 0%, #1677ff 100%)',
                border: 'none',
              }}
            >
              登录
            </Button>
          </Form.Item>

          <Button
            type="link"
            block
            onClick={() => {
              form.setFieldsValue({ username: 'admin', password: 'Admin@123' })
              handleSubmit({ username: 'admin', password: 'Admin@123' })
            }}
            style={{ marginTop: -8, marginBottom: 8 }}
          >
            一键演示账号登录
          </Button>
        </Form>

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <a href="/login">
            <Text type="secondary">返回租户登录</Text>
          </a>
        </div>

        <Divider style={{ margin: '16px 0 12px', color: token.colorTextQuaternary, fontSize: 12 }}>
          演示环境
        </Divider>

        <Button
          type="link"
          block
          onClick={() => {
            form.setFieldsValue({ username: 'admin', password: 'Admin@123' })
            handleSubmit({ username: 'admin', password: 'Admin@123' })
          }}
          style={{
            background: token.colorFillAlter,
            border: `1px dashed ${token.colorBorderSecondary}`,
            borderRadius: 8,
            padding: '12px 16px',
            height: 'auto',
            textAlign: 'left',
          }}
        >
          <Space direction="vertical" size={0} style={{ width: '100%' }}>
            <Text style={{ fontSize: 12, color: token.colorTextSecondary }}>
              账号: admin
            </Text>
            <Text style={{ fontSize: 12, color: token.colorTextSecondary }}>
              密码: Admin@123
            </Text>
          </Space>
        </Button>
      </Card>
    </div>
  )
}

export default AdminLogin
