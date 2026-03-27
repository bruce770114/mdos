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
  LeftOutlined,
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
  { key: '/admin/dashboard', icon: <DashboardOutlined />, label: '平台总览' },
  { key: '/admin/analytics', icon: <LineChartOutlined />, label: '运营分析' },
  { key: '/admin/revenue', icon: <DollarOutlined />, label: '收入报表' },
  { key: '/admin/tenants', icon: <TeamOutlined />, label: '租户管理' },
  { key: '/admin/spaces', icon: <CloudServerOutlined />, label: '存储空间' },
  { key: '/admin/plans', icon: <ShoppingOutlined />, label: '套餐管理' },
  { key: '/admin/orders', icon: <FileTextOutlined />, label: '订阅订单' },
  { key: '/admin/audit-logs', icon: <HistoryOutlined />, label: '审计日志' },
  { key: '/admin/admins', icon: <UserAddOutlined />, label: '管理员' },
  { key: '/admin/settings', icon: <SettingOutlined />, label: '系统配置' },
]

const breadcrumbMap: Record<string, string> = {
  '/admin/dashboard': '平台总览',
  '/admin/analytics': '运营分析',
  '/admin/revenue': '收入报表',
  '/admin/tenants': '租户管理',
  '/admin/spaces': '存储空间管理',
  '/admin/plans': '套餐管理',
  '/admin/orders': '订阅订单',
  '/admin/audit-logs': '审计日志',
  '/admin/admins': '管理员管理',
  '/admin/settings': '系统配置',
}

const PlatformLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useDispatch()
  const { user } = useAuth()
  const { token } = theme.useToken()

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
        key: 'back',
        icon: <LeftOutlined />,
        label: '返回租户系统',
        onClick: () => navigate('/dashboard'),
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

  const currentTitle = breadcrumbMap[location.pathname] ?? '平台管理'

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={220}
        style={{
          background: '#001529',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 100,
        }}
      >
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            paddingLeft: collapsed ? 0 : 24,
            borderBottom: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'linear-gradient(135deg, #722ed1 0%, #1677ff 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 700,
              fontSize: 16,
              flexShrink: 0,
            }}
          >
            P
          </div>
          {!collapsed && (
            <span style={{ color: '#fff', marginLeft: 12, fontWeight: 600, fontSize: 15 }}>
              平台管控台
            </span>
          )}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
          style={{ marginTop: 8 }}
        />
      </Sider>

      <Layout style={{ marginLeft: collapsed ? 80 : 220, transition: 'margin-left 0.2s' }}>
        <Header
          style={{
            background: '#fff',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 99,
            boxShadow: '0 1px 4px rgba(0,21,41,0.08)',
            height: 56,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
            />
            <span style={{ fontWeight: 600, color: '#333' }}>{currentTitle}</span>
            <span
              style={{
                background: 'linear-gradient(135deg, #722ed1 0%, #1677ff 100%)',
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
              <Avatar size={30} style={{ background: '#722ed1' }} icon={<UserOutlined />} />
              <span style={{ fontSize: 14 }}>{user?.username}</span>
            </div>
          </Dropdown>
        </Header>

        <Content
          style={{
            background: '#f5f5f5',
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
