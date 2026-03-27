import React, { lazy, Suspense, useState } from 'react'
import { Layout, Menu, Avatar, Dropdown, Button, theme, Spin } from 'antd'
import {
  DashboardOutlined,
  TeamOutlined,
  CloudServerOutlined,
  ShoppingOutlined,
  FileTextOutlined,
  LogoutOutlined,
  UserOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  LineChartOutlined,
  HistoryOutlined,
  UserAddOutlined,
  SettingOutlined,
  DollarOutlined,
} from '@ant-design/icons'
import { useNavigate, useLocation, Routes, Route, Navigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { logout } from '../../store/slices/authSlice'
import { useAuth } from '../../hooks/useAuth'

const PlatformDashboard = lazy(() => import('./PlatformDashboard'))
const PlatformTenants = lazy(() => import('./PlatformTenants'))
const PlatformSpaces = lazy(() => import('./PlatformSpaces'))
const PlatformPlans = lazy(() => import('./PlatformPlans'))
const PlatformOrders = lazy(() => import('./PlatformOrders'))
const PlatformAnalytics = lazy(() => import('./PlatformAnalytics'))
const PlatformAuditLogs = lazy(() => import('./PlatformAuditLogs'))
const PlatformAdmins = lazy(() => import('./PlatformAdmins'))
const PlatformSettings = lazy(() => import('./PlatformSettings'))
const PlatformRevenue = lazy(() => import('./PlatformRevenue'))

const { Sider, Header, Content } = Layout

const menuItems = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: '平台总览' },
  { key: '/analytics', icon: <LineChartOutlined />, label: '运营分析' },
  { key: '/revenue', icon: <DollarOutlined />, label: '收入报表' },
  { key: '/tenants', icon: <TeamOutlined />, label: '租户管理' },
  { key: '/spaces', icon: <CloudServerOutlined />, label: '存储空间' },
  { key: '/plans', icon: <ShoppingOutlined />, label: '套餐管理' },
  { key: '/orders', icon: <FileTextOutlined />, label: '订阅订单' },
  { key: '/audit-logs', icon: <HistoryOutlined />, label: '审计日志' },
  { key: '/admins', icon: <UserAddOutlined />, label: '管理员' },
  { key: '/settings', icon: <SettingOutlined />, label: '系统配置' },
]

const breadcrumbMap: Record<string, string> = {
  '/dashboard': '平台总览',
  '/analytics': '运营分析',
  '/revenue': '收入报表',
  '/tenants': '租户管理',
  '/spaces': '存储空间管理',
  '/plans': '套餐管理',
  '/orders': '订阅订单',
  '/audit-logs': '审计日志',
  '/admins': '管理员管理',
  '/settings': '系统配置',
}

const PlatformLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useDispatch()
  const { user } = useAuth()
  const { token: designToken } = theme.useToken()

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key)
  }

  const handleLogout = () => {
    dispatch(logout())
    navigate('/login')
  }

  const userMenu = {
    items: [
      {
        key: 'profile',
        icon: <UserOutlined />,
        label: '个人资料',
        onClick: () => navigate('/settings'),
      },
      { type: 'divider' as const },
      {
        key: 'logout',
        icon: <LogoutOutlined />,
        label: '退出登录',
        onClick: handleLogout,
      },
    ],
  }

  const currentTitle = breadcrumbMap[location.pathname] ?? 'SaaS管理后台'

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
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
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 14, letterSpacing: '-0.5px' }}>P</span>
          </div>
          {!collapsed && (
            <span
              style={{
                marginLeft: 10,
                fontWeight: 700,
                fontSize: 16,
                color: designToken.colorText,
                whiteSpace: 'nowrap',
              }}
            >
              SaaS管理后台
            </span>
          )}
        </div>
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

      <Layout style={{ marginLeft: collapsed ? 80 : 240, transition: 'margin-left 0.2s' }}>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{ fontSize: 16, width: 40, height: 40 }}
            />
            <span style={{ color: designToken.colorTextSecondary, fontSize: 14 }}>{currentTitle}</span>
            <span
              style={{
                background: 'linear-gradient(135deg, #1677ff 0%, #0958d9 100%)',
                color: '#fff',
                padding: '2px 8px',
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              SaaS 平台管控
            </span>
          </div>
          <Dropdown menu={userMenu} placement="bottomRight">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <Avatar size={30} style={{ background: '#1677ff' }} icon={<UserOutlined />} />
              <span style={{ fontSize: 14 }}>{user?.username}</span>
            </div>
          </Dropdown>
        </Header>

        <Content
          style={{
            background: designToken.colorBgLayout,
            minHeight: 'calc(100vh - 56px)',
            padding: 24,
          }}
        >
          <Suspense fallback={<Spin style={{ display: 'block', margin: '64px auto' }} />}>
            <Routes>
              <Route path="dashboard" element={<PlatformDashboard />} />
              <Route path="analytics" element={<PlatformAnalytics />} />
              <Route path="revenue" element={<PlatformRevenue />} />
              <Route path="tenants" element={<PlatformTenants />} />
              <Route path="spaces" element={<PlatformSpaces />} />
              <Route path="plans" element={<PlatformPlans />} />
              <Route path="orders" element={<PlatformOrders />} />
              <Route path="audit-logs" element={<PlatformAuditLogs />} />
              <Route path="admins" element={<PlatformAdmins />} />
              <Route path="settings" element={<PlatformSettings />} />
              <Route path="*" element={<Navigate to="dashboard" replace />} />
            </Routes>
          </Suspense>
        </Content>
      </Layout>
    </Layout>
  )
}

export default PlatformLayout
