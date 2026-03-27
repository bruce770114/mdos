import React from 'react'
import { Typography, Breadcrumb } from 'antd'
import { HomeOutlined } from '@ant-design/icons'

const { Title, Text } = Typography

interface BreadcrumbItem {
  title: string
  href?: string
}

interface Props {
  title: string
  subtitle?: string
  extra?: React.ReactNode
  breadcrumbs?: BreadcrumbItem[]
}

/**
 * Reusable page header component used across all major pages.
 *
 * Renders an optional breadcrumb trail, a prominent page title, an optional
 * subtitle, and an optional right-side action area (buttons, selectors, etc.).
 */
const PageHeader: React.FC<Props> = ({ title, subtitle, extra, breadcrumbs }) => {
  const breadcrumbItems = [
    {
      href: '/',
      title: <HomeOutlined />,
    },
    ...(breadcrumbs ?? []).map((item) =>
      item.href
        ? { href: item.href, title: item.title }
        : { title: item.title }
    ),
  ]

  return (
    <div
      style={{
        marginBottom: 24,
        paddingBottom: 16,
        borderBottom: '1px solid #f0f0f0',
      }}
    >
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumb items={breadcrumbItems} style={{ marginBottom: 8 }} />
      )}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        <div>
          <Title level={4} style={{ margin: 0, lineHeight: 1.4 }}>
            {title}
          </Title>
          {subtitle && (
            <Text type="secondary" style={{ fontSize: 13, marginTop: 4, display: 'block' }}>
              {subtitle}
            </Text>
          )}
        </div>
        {extra && (
          <div style={{ flexShrink: 0, display: 'flex', gap: 8, alignItems: 'center' }}>
            {extra}
          </div>
        )}
      </div>
    </div>
  )
}

export default PageHeader
