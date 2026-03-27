import React, { useState } from 'react'
import { Layout, Menu, Avatar, Badge, Dropdown, Button, Typography, Space, theme, Divider } from 'antd'
import type { MenuProps } from 'antd'
import {
  DashboardOutlined,
  HomeOutlined,
  TeamOutlined,
  FileTextOutlined,
  AccountBookOutlined,
  DollarOutlined,
  EnvironmentOutlined,
  SafetyOutlined,
  SettingOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  BellOutlined,
  UserOutlined,
  LogoutOutlined,
  ControlOutlined,
  GlobalOutlined,
  CrownOutlined,
} from '@ant-design/icons'
import { useNavigate, useLocation } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import type { RootState, AppDispatch } from '@/store'
import { logout } from '@/store/slices/authSlice'
import AppRouter from '@/router'
import { useTranslation } from 'react-i18next'
import i18n, { SUPPORTED_LANGUAGES } from '@/i18n'

const { Sider, Header, Content } = Layout
const { Text } = Typography

// ─── Component ────────────────────────────────────────────────────────────

const MainLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useDispatch<AppDispatch>()
  const { token: designToken } = theme.useToken()
  const { t } = useTranslation()

  const user = useSelector((state: RootState) => state.auth.user)
  const unreadCount = 0

  // ─── Menu config ──────────────────────────────────────────────────────────
  type MenuItem = Required<MenuProps>['items'][number]

  const menuItems: MenuItem[] = [
    { key: '/dashboard', icon: <DashboardOutlined />, label: t('nav.dashboard') },
    { key: '/units', icon: <HomeOutlined />, label: t('nav.units') },
    { key: '/customers', icon: <TeamOutlined />, label: t('nav.customers') },
    { key: '/contracts', icon: <FileTextOutlined />, label: t('nav.contracts') },
    { key: '/billing', icon: <AccountBookOutlined />, label: t('nav.billing') },
    { key: '/financial', icon: <DollarOutlined />, label: t('nav.financial') },
    { key: '/asset-map', icon: <EnvironmentOutlined />, label: t('nav.assetMap') },
    { key: '/permissions', icon: <SafetyOutlined />, label: t('nav.permissions') },
    { key: '/llm-models', icon: <ControlOutlined />, label: t('nav.llmModels') },
    { key: '/settings', icon: <SettingOutlined />, label: t('nav.settings') },
    { key: '/subscription', icon: <CrownOutlined />, label: t('nav.subscription') },
  ]

  // ─── Breadcrumb label map ─────────────────────────────────────────────────
  const breadcrumbMap: Record<string, string> = {
    '/dashboard': t('nav.dashboard'),
    '/units': t('nav.units'),
    '/customers': t('nav.customers'),
    '/contracts': t('nav.contracts'),
    '/billing': t('nav.billing'),
    '/financial': t('nav.financial'),
    '/asset-map': t('nav.assetMap'),
    '/permissions': t('nav.permissions'),
    '/llm-models': t('nav.llmModels'),
    '/settings': t('nav.settings'),
    '/notifications': t('nav.notifications'),
    '/subscription': t('nav.subscription'),
  }

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    navigate(key)
  }

  const handleLogout = () => {
    dispatch(logout())
    navigate('/login', { replace: true })
  }

  const handleLanguageSwitch = (lang: string) => {
    i18n.changeLanguage(lang)
  }

  const currentLang = i18n.language?.split('-')[0] ?? 'zh'

  const langMenuItems: MenuProps['items'] = SUPPORTED_LANGUAGES.map((lang) => ({
    key: lang.value,
    label: (
      <Space>
        {lang.value === currentLang && (
          <span style={{ color: designToken.colorPrimary, fontSize: 10 }}>✓</span>
        )}
        {lang.label}
      </Space>
    ),
    onClick: () => handleLanguageSwitch(lang.value),
  }))

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: t('user.profile'),
      onClick: () => navigate('/settings'),
    },
    ...(user?.isPlatformAdmin
      ? [
          { type: 'divider' as const },
          {
            key: 'admin',
            icon: <ControlOutlined />,
            label: t('user.platformConsole'),
            onClick: () => navigate('/admin/dashboard'),
          },
        ]
      : []),
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: t('user.logout'),
      danger: true,
      onClick: handleLogout,
    },
  ]

  const currentLabel = breadcrumbMap[location.pathname] ?? ''

  return (
    <Layout style={{ height: '100vh' }}>
      {/* ── Sidebar ──────────────────────────────────────────────────── */}
      <Sider
        collapsible
        collapsed={collapsed}
        trigger={null}
        width={240}
        collapsedWidth={80}
        style={{
          background: designToken.colorBgContainer,
          borderRight: `1px solid ${designToken.colorBorderSecondary}`,
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 100,
          boxShadow: '2px 0 8px rgba(0,0,0,0.06)',
        }}
      >
        {/* Logo area */}
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            padding: collapsed ? '0' : '0 20px',
            borderBottom: `1px solid ${designToken.colorBorderSecondary}`,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onClick={() => navigate('/dashboard')}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'linear-gradient(135deg, #1677ff 0%, #0958d9 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Text style={{ color: '#fff', fontWeight: 700, fontSize: 14, letterSpacing: '-0.5px' }}>M</Text>
          </div>
          {!collapsed && (
            <Text
              style={{
                marginLeft: 10,
                fontWeight: 700,
                fontSize: 16,
                color: designToken.colorText,
                whiteSpace: 'nowrap',
              }}
            >
              MDOS
            </Text>
          )}
        </div>

        {/* Navigation menu */}
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
          style={{
            border: 'none',
            marginTop: 8,
          }}
        />
      </Sider>

      {/* ── Main area ────────────────────────────────────────────────── */}
      <Layout style={{ marginLeft: collapsed ? 80 : 240, transition: 'margin-left 0.2s' }}>
        {/* Header */}
        <Header
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 99,
            padding: '0 24px',
            background: designToken.colorBgContainer,
            borderBottom: `1px solid ${designToken.colorBorderSecondary}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          }}
        >
          {/* Left — toggle + breadcrumb */}
          <Space size={16}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{ fontSize: 16, width: 40, height: 40 }}
            />
            {currentLabel && (
              <Text style={{ color: designToken.colorTextSecondary, fontSize: 14 }}>
                {currentLabel}
              </Text>
            )}
          </Space>

          {/* Right — language + notifications + user */}
          <Space size={8}>
            {/* Language switcher */}
            <Dropdown menu={{ items: langMenuItems }} placement="bottomRight" arrow>
              <Button
                type="text"
                icon={<GlobalOutlined style={{ fontSize: 16 }} />}
                style={{ width: 40, height: 40 }}
                title={t('user.language')}
              />
            </Dropdown>

            <Badge count={unreadCount} size="small">
              <Button
                type="text"
                icon={<BellOutlined style={{ fontSize: 18 }} />}
                style={{ width: 40, height: 40 }}
                onClick={() => navigate('/notifications')}
              />
            </Badge>

            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" arrow>
              <Space
                style={{ cursor: 'pointer', padding: '4px 8px', borderRadius: 6 }}
                className="user-info-trigger"
              >
                <Avatar
                  size={32}
                  style={{ background: designToken.colorPrimary }}
                  icon={<UserOutlined />}
                />
                <Text style={{ fontSize: 14, fontWeight: 500 }}>
                  {user?.username ?? t('user.username')}
                </Text>
              </Space>
            </Dropdown>
          </Space>
        </Header>

        {/* Content */}
        <Content
          style={{
            overflow: 'auto',
            background: '#f0f2f5',
            minHeight: 'calc(100vh - 64px)',
          }}
        >
          <AppRouter />
        </Content>
      </Layout>
    </Layout>
  )
}

export default MainLayout
