import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Tabs,
  List,
  Badge,
  Button,
  Empty,
  Spin,
  Alert,
  Typography,
  Tag,
  Pagination,
  Tooltip,
  message,
  Space,
} from 'antd'
import {
  BellOutlined,
  FileTextOutlined,
  DollarOutlined,
  AuditOutlined,
  SoundOutlined,
  CheckOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons'
import request from '@/utils/request'
import PageHeader from '@/components/PageHeader'
import { formatRelativeTime } from '@/utils/format'
import type { Notification } from '@/types'

const { Text, Paragraph } = Typography

// ---------------------------------------------------------------------------
// Notification type config
// ---------------------------------------------------------------------------

type NotificationType = 'all' | 'contract' | 'billing' | 'approval' | 'system'

interface TypeConfig {
  label: string
  icon: React.ReactNode
  color: string
  tagColor: string
}

const TYPE_CONFIG: Record<NotificationType, TypeConfig> = {
  all: {
    label: '全部',
    icon: <BellOutlined />,
    color: '#1677ff',
    tagColor: 'blue',
  },
  contract: {
    label: '合同提醒',
    icon: <FileTextOutlined />,
    color: '#1677ff',
    tagColor: 'blue',
  },
  billing: {
    label: '账务提醒',
    icon: <DollarOutlined />,
    color: '#52c41a',
    tagColor: 'success',
  },
  approval: {
    label: '审批通知',
    icon: <AuditOutlined />,
    color: '#faad14',
    tagColor: 'warning',
  },
  system: {
    label: '系统公告',
    icon: <SoundOutlined />,
    color: '#722ed1',
    tagColor: 'purple',
  },
}

// ---------------------------------------------------------------------------
// Notification item component
// ---------------------------------------------------------------------------

interface NotificationItemProps {
  notification: Notification
  onRead: (id: string) => void
}

const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onRead }) => {
  const [expanded, setExpanded] = useState(false)
  const type = (notification.type as NotificationType) ?? 'system'
  const cfg = TYPE_CONFIG[type] ?? TYPE_CONFIG.system
  const isUnread = !notification.readAt

  const handleClick = () => {
    if (isUnread) {
      onRead(notification.id)
    }
    setExpanded((prev) => !prev)
  }

  return (
    <List.Item
      onClick={handleClick}
      style={{
        padding: '14px 20px',
        cursor: 'pointer',
        background: isUnread ? '#f0f7ff' : '#fff',
        borderLeft: isUnread ? `3px solid ${cfg.color}` : '3px solid transparent',
        transition: 'background 0.2s, border-color 0.2s',
      }}
    >
      <div style={{ display: 'flex', gap: 14, width: '100%' }}>
        {/* Icon */}
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: `${cfg.color}18`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            color: cfg.color,
            fontSize: 18,
          }}
        >
          {cfg.icon}
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 8,
              marginBottom: 4,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Text
                strong={isUnread}
                style={{
                  fontSize: 14,
                  color: isUnread ? '#1f1f1f' : '#595959',
                }}
              >
                {notification.title}
              </Text>
              <Tag color={cfg.tagColor} style={{ fontSize: 11, margin: 0 }}>
                {cfg.label}
              </Tag>
              {isUnread && (
                <Badge
                  dot
                  style={{ boxShadow: 'none' }}
                  color={cfg.color}
                />
              )}
            </div>
            <Tooltip title={notification.createdAt}>
              <Text
                type="secondary"
                style={{ fontSize: 12, flexShrink: 0, marginTop: 2 }}
              >
                {formatRelativeTime(notification.createdAt)}
              </Text>
            </Tooltip>
          </div>

          {/* Preview / expanded content */}
          {!expanded ? (
            <Text
              type="secondary"
              style={{
                fontSize: 13,
                display: 'block',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {notification.content}
            </Text>
          ) : (
            <Paragraph
              style={{
                fontSize: 13,
                color: '#595959',
                marginBottom: 0,
                lineHeight: 1.7,
                background: '#fafafa',
                padding: '8px 12px',
                borderRadius: 6,
                marginTop: 4,
              }}
            >
              {notification.content}
            </Paragraph>
          )}
        </div>

        {/* Read indicator */}
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'flex-start', paddingTop: 2 }}>
          {!isUnread ? (
            <Tooltip title="已读">
              <CheckCircleOutlined style={{ color: '#d9d9d9', fontSize: 16 }} />
            </Tooltip>
          ) : (
            <Tooltip title="点击标为已读">
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: cfg.color,
                  marginTop: 6,
                }}
              />
            </Tooltip>
          )}
        </div>
      </div>
    </List.Item>
  )
}

// ---------------------------------------------------------------------------
// Root Notifications page
// ---------------------------------------------------------------------------

const PAGE_SIZE = 20

const Notifications: React.FC = () => {
  const [activeType, setActiveType] = useState<NotificationType>('all')
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [markingAll, setMarkingAll] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const unreadCountRef = useRef<number>(0)

  const fetchNotifications = useCallback(
    (type: NotificationType, p: number) => {
      setLoading(true)
      setError(null)
      const params: Record<string, string | number> = { page: p, pageSize: PAGE_SIZE }
      if (type !== 'all') params.type = type
      request
        .get<{ items: Notification[]; total: number }>('/notifications', { params })
        .then((res) => {
          setNotifications(res.data.items)
          setTotal(res.data.total)
          unreadCountRef.current = res.data.items.filter((n) => !n.readAt).length
        })
        .catch(() => setError('加载通知失败，请刷新重试'))
        .finally(() => setLoading(false))
    },
    []
  )

  useEffect(() => {
    fetchNotifications(activeType, page)
  }, [activeType, page, fetchNotifications])

  const handleTypeChange = (type: string) => {
    setActiveType(type as NotificationType)
    setPage(1)
  }

  const handleMarkRead = useCallback(
    async (id: string) => {
      try {
        await request.patch(`/notifications/${id}/read`)
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === id ? { ...n, readAt: new Date().toISOString() } : n
          )
        )
      } catch {
        message.error('标记失败，请重试')
      }
    },
    []
  )

  const handleMarkAllRead = async () => {
    setMarkingAll(true)
    try {
      const params = activeType !== 'all' ? { type: activeType } : {}
      await request.post('/notifications/mark-all-read', params)
      message.success('已全部标为已读')
      fetchNotifications(activeType, page)
    } catch {
      message.error('操作失败，请重试')
    } finally {
      setMarkingAll(false)
    }
  }

  // Build tab items with unread badge
  const tabItems = (Object.entries(TYPE_CONFIG) as [NotificationType, TypeConfig][]).map(
    ([key, cfg]) => ({
      key,
      label: (
        <Space size={4}>
          {cfg.icon}
          {cfg.label}
        </Space>
      ),
    })
  )

  const unreadCount = notifications.filter((n) => !n.readAt).length

  return (
    <div style={{ padding: 24, background: '#f5f5f5', minHeight: '100vh' }}>
      <PageHeader
        title="消息中心"
        subtitle="查看系统通知、合同提醒和审批消息"
        breadcrumbs={[{ title: '消息中心' }]}
        extra={
          <Button
            icon={<CheckOutlined />}
            loading={markingAll}
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0}
          >
            全部标为已读
            {unreadCount > 0 && (
              <Badge
                count={unreadCount}
                size="small"
                style={{ marginLeft: 4, boxShadow: 'none' }}
              />
            )}
          </Button>
        }
      />

      <div
        style={{
          background: '#fff',
          borderRadius: 10,
          overflow: 'hidden',
          border: '1px solid #f0f0f0',
        }}
      >
        {/* Tab bar */}
        <div style={{ padding: '0 20px', borderBottom: '1px solid #f0f0f0' }}>
          <Tabs
            activeKey={activeType}
            onChange={handleTypeChange}
            items={tabItems}
            size="small"
          />
        </div>

        {/* Content */}
        {error ? (
          <div style={{ padding: 24 }}>
            <Alert type="error" message={error} showIcon />
          </div>
        ) : loading ? (
          <div style={{ textAlign: 'center', padding: 80 }}>
            <Spin size="large" tip="加载消息..." />
          </div>
        ) : notifications.length === 0 ? (
          <div style={{ padding: 60 }}>
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <span>
                  <Text type="secondary">暂无</Text>
                  <Text type="secondary">
                    {activeType === 'all' ? '' : TYPE_CONFIG[activeType].label}
                  </Text>
                  <Text type="secondary">通知</Text>
                </span>
              }
            />
          </div>
        ) : (
          <>
            <List
              dataSource={notifications}
              renderItem={(item) => (
                <NotificationItem
                  key={item.id}
                  notification={item}
                  onRead={handleMarkRead}
                />
              )}
              split
              style={{ borderRadius: 0 }}
            />

            {/* Pagination */}
            {total > PAGE_SIZE && (
              <div
                style={{
                  padding: '12px 20px',
                  borderTop: '1px solid #f0f0f0',
                  display: 'flex',
                  justifyContent: 'flex-end',
                }}
              >
                <Pagination
                  current={page}
                  total={total}
                  pageSize={PAGE_SIZE}
                  onChange={(p) => setPage(p)}
                  showTotal={(t) => `共 ${t} 条`}
                  showSizeChanger={false}
                  size="small"
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default Notifications
