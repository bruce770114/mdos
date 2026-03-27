import React from 'react'
import { Layout, theme } from 'antd'

const { Content } = Layout

interface AuthLayoutProps {
  children: React.ReactNode
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  const { token } = theme.useToken()

  return (
    <Layout
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #e6f0ff 0%, #f0f5ff 40%, #f5f0ff 100%)',
      }}
    >
      {/* Decorative background circles */}
      <div
        style={{
          position: 'fixed',
          top: '-10%',
          right: '-5%',
          width: 400,
          height: 400,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(22,119,255,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'fixed',
          bottom: '-10%',
          left: '-5%',
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(9,88,217,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <Content
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '24px',
        }}
      >
        {/* Brand header above card */}
        <div style={{ marginBottom: 32, textAlign: 'center' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 56,
              height: 56,
              borderRadius: 16,
              background: 'linear-gradient(135deg, #1677ff 0%, #0958d9 100%)',
              boxShadow: '0 8px 24px rgba(22,119,255,0.35)',
              marginBottom: 16,
            }}
          >
            <span style={{ color: '#fff', fontWeight: 800, fontSize: 22, letterSpacing: '-1px' }}>
              M
            </span>
          </div>
          <div
            style={{
              fontSize: 13,
              color: token.colorTextSecondary,
              letterSpacing: 1,
              textTransform: 'uppercase',
            }}
          >
            AI 不动产管理平台
          </div>
        </div>

        {/* Page content (login card) */}
        {children}

        {/* Footer */}
        <div
          style={{
            marginTop: 32,
            color: token.colorTextQuaternary,
            fontSize: 12,
            textAlign: 'center',
          }}
        >
          © {new Date().getFullYear()} MDOS. All rights reserved.
        </div>
      </Content>
    </Layout>
  )
}

export default AuthLayout
