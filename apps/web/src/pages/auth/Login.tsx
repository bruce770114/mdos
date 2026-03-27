import React, { useState } from 'react'
import {
  Card,
  Form,
  Input,
  Button,
  Typography,
  Alert,
  Space,
  Divider,
  theme,
  Dropdown,
} from 'antd'
import type { MenuProps } from 'antd'
import {
  UserOutlined,
  LockOutlined,
  BankOutlined,
  ArrowRightOutlined,
  GlobalOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import type { AppDispatch } from '@/store'
import { setCredentials } from '@/store/slices/authSlice'
import request from '@/utils/request'
import type { ApiResponse, User } from '@/types'
import { useTranslation } from 'react-i18next'
import i18n, { SUPPORTED_LANGUAGES } from '@/i18n'

const { Title, Text, Link } = Typography

interface LoginFormValues {
  tenantCode: string
  username: string
  password: string
}

interface LoginResponseData {
  accessToken: string
  refreshToken: string
  user: User
}

const Login: React.FC = () => {
  const [form] = Form.useForm<LoginFormValues>()
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const navigate = useNavigate()
  const dispatch = useDispatch<AppDispatch>()
  const { token } = theme.useToken()
  const { t } = useTranslation()

  const handleSubmit = async (values: LoginFormValues) => {
    setLoading(true)
    setErrorMsg(null)

    try {
      const res = await request.post<unknown, ApiResponse<LoginResponseData>>('/auth/login', {
        tenantCode: values.tenantCode.trim(),
        username: values.username.trim(),
        password: values.password,
      })

      dispatch(
        setCredentials({
          user: res.data.user,
          accessToken: res.data.accessToken,
          refreshToken: res.data.refreshToken,
        })
      )

      navigate('/dashboard', { replace: true })
    } catch (err: unknown) {
      const apiErr = err as { message?: string; code?: number }
      setErrorMsg(apiErr?.message ?? t('auth.loginFailed'))
    } finally {
      setLoading(false)
    }
  }

  const fillDemo = () => {
    form.setFieldsValue({
      tenantCode: 'DEMO',
      username: 'admin',
      password: 'Admin@123',
    })
  }

  const currentLang = i18n.language?.split('-')[0] ?? 'zh'

  const langMenuItems: MenuProps['items'] = SUPPORTED_LANGUAGES.map((lang) => ({
    key: lang.value,
    label: (
      <Space>
        {lang.value === currentLang && (
          <span style={{ color: token.colorPrimary, fontSize: 10 }}>✓</span>
        )}
        {lang.label}
      </Space>
    ),
    onClick: () => i18n.changeLanguage(lang.value),
  }))

  return (
    <Card
      style={{
        width: '100%',
        maxWidth: 420,
        borderRadius: 16,
        boxShadow: '0 8px 40px rgba(0,0,0,0.10)',
        border: 'none',
      }}
      styles={{ body: { padding: '40px 40px 32px' } }}
    >
      {/* Language switcher */}
      <div style={{ position: 'absolute', top: 16, right: 16 }}>
        <Dropdown menu={{ items: langMenuItems }} placement="bottomRight" arrow>
          <Button
            type="text"
            size="small"
            icon={<GlobalOutlined />}
            style={{ color: token.colorTextSecondary }}
          >
            {SUPPORTED_LANGUAGES.find((l) => l.value === currentLang)?.label ?? 'Language'}
          </Button>
        </Dropdown>
      </div>

      {/* Card header */}
      <div style={{ marginBottom: 32, textAlign: 'center' }}>
        <Title level={3} style={{ margin: 0, fontWeight: 700, color: token.colorText }}>
          {t('auth.loginTitle')}
        </Title>
        <Text type="secondary" style={{ fontSize: 13, marginTop: 4, display: 'block' }}>
          {t('auth.loginSubtitle')}
        </Text>
      </div>

      {/* Error banner */}
      {errorMsg && (
        <Alert
          message={errorMsg}
          type="error"
          showIcon
          closable
          onClose={() => setErrorMsg(null)}
          style={{ marginBottom: 20, borderRadius: 8 }}
        />
      )}

      {/* Login form */}
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        requiredMark={false}
        size="large"
      >
        <Form.Item
          name="tenantCode"
          label={t('auth.tenantCode')}
          rules={[{ required: true, message: t('auth.tenantCodeRequired') }]}
        >
          <Input
            prefix={<BankOutlined style={{ color: token.colorTextQuaternary }} />}
            placeholder={t('auth.tenantCodePlaceholder')}
            autoComplete="organization"
            style={{ borderRadius: 8 }}
          />
        </Form.Item>

        <Form.Item
          name="username"
          label={t('auth.username')}
          rules={[{ required: true, message: t('auth.usernameRequired') }]}
        >
          <Input
            prefix={<UserOutlined style={{ color: token.colorTextQuaternary }} />}
            placeholder={t('auth.usernamePlaceholder')}
            autoComplete="username"
            style={{ borderRadius: 8 }}
          />
        </Form.Item>

        <Form.Item
          name="password"
          label={t('auth.password')}
          rules={[{ required: true, message: t('auth.passwordRequired') }]}
          style={{ marginBottom: 24 }}
        >
          <Input.Password
            prefix={<LockOutlined style={{ color: token.colorTextQuaternary }} />}
            placeholder={t('auth.passwordPlaceholder')}
            autoComplete="current-password"
            style={{ borderRadius: 8 }}
          />
        </Form.Item>

        <Form.Item style={{ marginBottom: 12 }}>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            block
            icon={<ArrowRightOutlined />}
            iconPosition="end"
            style={{
              height: 44,
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 15,
              background: 'linear-gradient(90deg, #1677ff 0%, #0958d9 100%)',
              border: 'none',
              boxShadow: '0 4px 12px rgba(22,119,255,0.35)',
            }}
          >
            {t('auth.login')}
          </Button>
        </Form.Item>
      </Form>

      {/* Demo hint */}
      <Divider style={{ margin: '12px 0 16px', color: token.colorTextQuaternary, fontSize: 12 }}>
        {t('auth.demoEnv')}
      </Divider>

      <div
        style={{
          background: token.colorFillAlter,
          borderRadius: 8,
          padding: '12px 16px',
          border: `1px dashed ${token.colorBorderSecondary}`,
        }}
      >
        <Space direction="vertical" size={2} style={{ width: '100%' }}>
          <Text style={{ fontSize: 12, color: token.colorTextSecondary }}>
            {t('auth.demoAccount')}
          </Text>
          <Link
            style={{ fontSize: 12 }}
            onClick={fillDemo}
          >
            {t('auth.autoFill')}
          </Link>
        </Space>
      </div>
    </Card>
  )
}

export default Login
