import React, { useState, useEffect, useCallback } from 'react'
import {
  Tabs,
  Form,
  Input,
  Button,
  Switch,
  Select,
  Checkbox,
  InputNumber,
  Upload,
  Table,
  message,
  Spin,
  Alert,
  Space,
  Typography,
  Divider,
  Card,
  Row,
  Col,
  Radio,
} from 'antd'
import type { TableColumnsType } from 'antd'
import type { UploadProps } from 'antd/es/upload'
import {
  SaveOutlined,
  UploadOutlined,
  DownloadOutlined,
  SendOutlined,
  SettingOutlined,
  BellOutlined,
  ApiOutlined,
  DatabaseOutlined,
  GlobalOutlined,
} from '@ant-design/icons'
import request from '@/utils/request'
import PageHeader from '@/components/PageHeader'
import { formatDateTime } from '@/utils/format'
import { useTranslation } from 'react-i18next'
import i18n from '@/i18n'

const { Text, Paragraph } = Typography
const { TextArea } = Input

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BasicConfig {
  companyName: string
  systemName: string
  logoUrl?: string
  timezone: string
  currency: string
  contractExpiryReminders: number[]
  billingDay: number
}

interface NotificationConfig {
  emailEnabled: boolean
  smsEnabled: boolean
  systemEnabled: boolean
  emailTemplate?: string
}

interface SmtpConfig {
  host: string
  port: number
  user: string
  password: string
}

interface EsignConfig {
  platform: 'fadada' | 'esign'
  appId: string
  appSecret: string
}

interface IntegrationConfig {
  smtp: SmtpConfig
  esign: EsignConfig
}

interface I18nConfig {
  defaultLanguage: string
  supportedLanguages: string[]
  dateFormat: string
  timeFormat: '12h' | '24h'
  currency: string
  numberFormat: 'comma' | 'space'
  timezone: string
}

// ---------------------------------------------------------------------------
// Section title helper
// ---------------------------------------------------------------------------

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ marginBottom: 16, marginTop: 4 }}>
    <Text strong style={{ fontSize: 14, color: '#1677ff' }}>
      {children}
    </Text>
    <Divider style={{ marginTop: 8, marginBottom: 16 }} />
  </div>
)

// ---------------------------------------------------------------------------
// 1. 基础配置 tab
// ---------------------------------------------------------------------------

const BasicConfigTab: React.FC = () => {
  const [form] = Form.useForm<BasicConfig>()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { t } = useTranslation()

  useEffect(() => {
    request
      .get<BasicConfig>('/settings/basic')
      .then((res) => form.setFieldsValue(res.data))
      .catch(() => message.error(t('settings.basic.loadFailed')))
      .finally(() => setLoading(false))
  }, [form, t])

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      setSaving(true)
      await request.put('/settings/basic', values)
      message.success(t('settings.basic.saveSuccess'))
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'errorFields' in err) return
      message.error(t('common.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <Spin />
      </div>
    )
  }

  return (
    <Form form={form} layout="vertical" style={{ maxWidth: 640 }}>
      <SectionTitle>{t('settings.basic.sectionCompany')}</SectionTitle>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="companyName"
            label={t('settings.basic.companyName')}
            rules={[{ required: true, message: t('settings.basic.companyNameRequired') }]}
          >
            <Input placeholder={t('settings.basic.companyNamePlaceholder')} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="systemName"
            label={t('settings.basic.systemName')}
            rules={[{ required: true, message: t('settings.basic.systemNameRequired') }]}
          >
            <Input placeholder={t('settings.basic.systemNamePlaceholder')} />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item name="logoUrl" label={t('settings.basic.logoUrl')}>
        <Input placeholder={t('settings.basic.logoUrlPlaceholder')} />
      </Form.Item>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item name="timezone" label={t('settings.basic.timezone')} rules={[{ required: true }]}>
            <Select
              options={[
                { label: 'Asia/Shanghai（北京时间）', value: 'Asia/Shanghai' },
                { label: 'Asia/Hong_Kong（香港时间）', value: 'Asia/Hong_Kong' },
                { label: 'UTC（协调世界时）', value: 'UTC' },
              ]}
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="currency" label={t('settings.basic.currency')} rules={[{ required: true }]}>
            <Select
              options={[
                { label: '人民币 (CNY ¥)', value: 'CNY' },
                { label: '港币 (HKD HK$)', value: 'HKD' },
                { label: '美元 (USD $)', value: 'USD' },
              ]}
            />
          </Form.Item>
        </Col>
      </Row>

      <SectionTitle>{t('settings.basic.sectionLease')}</SectionTitle>

      <Form.Item
        name="contractExpiryReminders"
        label={t('settings.basic.contractExpiryReminders')}
        extra={t('settings.basic.contractExpiryRemindersExtra')}
      >
        <Checkbox.Group>
          <Space>
            <Checkbox value={30}>30 {t('common.days')}</Checkbox>
            <Checkbox value={60}>60 {t('common.days')}</Checkbox>
            <Checkbox value={90}>90 {t('common.days')}</Checkbox>
          </Space>
        </Checkbox.Group>
      </Form.Item>

      <Form.Item
        name="billingDay"
        label={t('settings.basic.billingDay')}
        extra={t('settings.basic.billingDayExtra')}
        rules={[{ required: true, message: t('common.required') }]}
      >
        <InputNumber min={1} max={28} placeholder="1" style={{ width: 120 }} />
      </Form.Item>

      <Form.Item>
        <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSave}>
          {t('settings.basic.saveConfig')}
        </Button>
      </Form.Item>
    </Form>
  )
}

// ---------------------------------------------------------------------------
// 2. 通知配置 tab
// ---------------------------------------------------------------------------

const NotificationConfigTab: React.FC = () => {
  const [form] = Form.useForm<NotificationConfig>()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { t } = useTranslation()

  useEffect(() => {
    request
      .get<NotificationConfig>('/settings/notifications')
      .then((res) => form.setFieldsValue(res.data))
      .catch(() => message.error(t('settings.notifications.loadFailed')))
      .finally(() => setLoading(false))
  }, [form, t])

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      setSaving(true)
      await request.put('/settings/notifications', values)
      message.success(t('settings.notifications.saveSuccess'))
    } catch {
      message.error(t('common.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <Spin />
      </div>
    )
  }

  return (
    <Form form={form} layout="vertical" style={{ maxWidth: 640 }}>
      <SectionTitle>{t('settings.notifications.sectionChannel')}</SectionTitle>

      <Card style={{ marginBottom: 20, borderRadius: 8 }}>
        <Space direction="vertical" style={{ width: '100%' }} size={16}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Text strong>{t('settings.notifications.email')}</Text>
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {t('settings.notifications.emailDesc')}
                </Text>
              </div>
            </div>
            <Form.Item name="emailEnabled" valuePropName="checked" style={{ margin: 0 }}>
              <Switch />
            </Form.Item>
          </div>

          <Divider style={{ margin: 0 }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Text strong>{t('settings.notifications.sms')}</Text>
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {t('settings.notifications.smsDesc')}
                </Text>
              </div>
            </div>
            <Form.Item name="smsEnabled" valuePropName="checked" style={{ margin: 0 }}>
              <Switch />
            </Form.Item>
          </div>

          <Divider style={{ margin: 0 }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Text strong>{t('settings.notifications.system')}</Text>
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {t('settings.notifications.systemDesc')}
                </Text>
              </div>
            </div>
            <Form.Item name="systemEnabled" valuePropName="checked" style={{ margin: 0 }}>
              <Switch />
            </Form.Item>
          </div>
        </Space>
      </Card>

      <SectionTitle>{t('settings.notifications.sectionTemplate')}</SectionTitle>

      <Form.Item
        name="emailTemplate"
        label={t('settings.notifications.emailTemplate')}
        extra={t('settings.notifications.emailTemplateExtra')}
      >
        <TextArea rows={6} />
      </Form.Item>

      <Form.Item>
        <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSave}>
          {t('common.save')}
        </Button>
      </Form.Item>
    </Form>
  )
}

// ---------------------------------------------------------------------------
// 3. 集成配置 tab
// ---------------------------------------------------------------------------

const IntegrationConfigTab: React.FC = () => {
  const [form] = Form.useForm<IntegrationConfig>()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testingSmtp, setTestingSmtp] = useState(false)
  const { t } = useTranslation()

  useEffect(() => {
    request
      .get<IntegrationConfig>('/settings/integrations')
      .then((res) => form.setFieldsValue(res.data))
      .catch(() => message.error(t('settings.integrations.loadFailed')))
      .finally(() => setLoading(false))
  }, [form, t])

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      setSaving(true)
      await request.put('/settings/integrations', values)
      message.success(t('settings.integrations.saveSuccess'))
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'errorFields' in err) return
      message.error(t('common.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  const handleTestSmtp = async () => {
    try {
      const smtp = form.getFieldValue('smtp') as SmtpConfig
      if (!smtp?.host || !smtp?.user) {
        message.warning(t('settings.integrations.smtpNotConfigured'))
        return
      }
      setTestingSmtp(true)
      await request.post('/settings/integrations/smtp/test', smtp)
      message.success(t('settings.integrations.testSuccess'))
    } catch {
      message.error(t('settings.integrations.testFailed'))
    } finally {
      setTestingSmtp(false)
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <Spin />
      </div>
    )
  }

  return (
    <Form form={form} layout="vertical" style={{ maxWidth: 640 }}>
      <SectionTitle>{t('settings.integrations.sectionSmtp')}</SectionTitle>

      <Row gutter={16}>
        <Col span={16}>
          <Form.Item
            name={['smtp', 'host']}
            label={t('settings.integrations.smtpHost')}
            rules={[{ required: true, message: t('settings.integrations.smtpHostRequired') }]}
          >
            <Input placeholder="smtp.example.com" />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item
            name={['smtp', 'port']}
            label={t('settings.integrations.smtpPort')}
            rules={[{ required: true, message: t('settings.integrations.smtpPortRequired') }]}
          >
            <InputNumber style={{ width: '100%' }} placeholder="465" min={1} max={65535} />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name={['smtp', 'user']}
            label={t('settings.integrations.smtpUser')}
            rules={[{ required: true, message: t('settings.integrations.smtpUserRequired') }]}
          >
            <Input placeholder="no-reply@example.com" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name={['smtp', 'password']} label={t('settings.integrations.smtpPassword')}>
            <Input.Password placeholder={t('settings.integrations.smtpPasswordPlaceholder')} />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item>
        <Button icon={<SendOutlined />} loading={testingSmtp} onClick={handleTestSmtp}>
          {t('settings.integrations.testConnection')}
        </Button>
      </Form.Item>

      <SectionTitle>{t('settings.integrations.sectionEsign')}</SectionTitle>

      <Form.Item
        name={['esign', 'platform']}
        label={t('settings.integrations.esignPlatform')}
        rules={[{ required: true, message: t('settings.integrations.esignPlatformRequired') }]}
      >
        <Select
          options={[
            { label: t('settings.integrations.fadada'), value: 'fadada' },
            { label: t('settings.integrations.esign'), value: 'esign' },
          ]}
          placeholder={t('settings.integrations.esignPlatformPlaceholder')}
        />
      </Form.Item>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name={['esign', 'appId']}
            label={t('settings.integrations.appId')}
            rules={[{ required: true, message: t('settings.integrations.appIdRequired') }]}
          >
            <Input placeholder={t('settings.integrations.appIdPlaceholder')} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name={['esign', 'appSecret']}
            label={t('settings.integrations.appSecret')}
            rules={[{ required: true, message: t('settings.integrations.appSecretRequired') }]}
          >
            <Input.Password placeholder={t('settings.integrations.appSecretPlaceholder')} />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item>
        <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSave}>
          {t('common.save')}
        </Button>
      </Form.Item>
    </Form>
  )
}

// ---------------------------------------------------------------------------
// 4. 数据管理 tab
// ---------------------------------------------------------------------------

const DataManagementTab: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([])
  const [logsLoading, setLogsLoading] = useState(true)
  const [logsPage, setLogsPage] = useState(1)
  const [logsTotal, setLogsTotal] = useState(0)
  const [exporting, setExporting] = useState(false)
  const { t } = useTranslation()

  const fetchLogs = useCallback(
    (page = 1) => {
      setLogsLoading(true)
      request
        .get<any>('/audit-logs', { params: { page, pageSize: 20 } })
        .then((res: any) => {
          const data = res.data ?? res
          setLogs(data.list ?? [])
          setLogsTotal(data.total ?? 0)
          setLogsPage(page)
        })
        .catch(() => {})
        .finally(() => setLogsLoading(false))
    },
    [],
  )

  useEffect(() => { fetchLogs(1) }, [fetchLogs])

  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await request.get('/data/export', { responseType: 'blob' })
      const blob = new Blob([res.data as BlobPart], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `mdos-data-export-${new Date().toISOString().slice(0, 10)}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
      message.success(t('settings.data.exportSuccess'))
    } catch {
      message.error(t('settings.data.exportFailed'))
    } finally {
      setExporting(false)
    }
  }

  const uploadProps: UploadProps = {
    name: 'file',
    accept: '.xlsx,.xls',
    action: '/api/v1/data/import',
    maxCount: 1,
    onChange(info) {
      if (info.file.status === 'done') {
        message.success(`${info.file.name} ${t('settings.data.uploadSuccess')}`)
      } else if (info.file.status === 'error') {
        message.error(`${info.file.name} ${t('settings.data.uploadFailed')}`)
      }
    },
  }

  const logColumns: TableColumnsType<any> = [
    {
      title: t('settings.data.logOperator'),
      dataIndex: 'username',
      width: 100,
      render: (v: string) => <Text strong>{v ?? '-'}</Text>,
    },
    {
      title: t('settings.data.logAction'),
      dataIndex: 'action',
      width: 100,
    },
    {
      title: t('settings.data.logModule'),
      dataIndex: 'module',
      width: 100,
    },
    {
      title: t('settings.data.logDetail'),
      dataIndex: 'resourceId',
      ellipsis: true,
      render: (v: string, r: any) => r.errorMessage ? <Text type="danger">{r.errorMessage}</Text> : (v ?? '-'),
    },
    {
      title: t('settings.data.logIp'),
      dataIndex: 'ipAddress',
      width: 130,
      render: (v: string) => <Text type="secondary" style={{ fontSize: 12 }}>{v ?? '-'}</Text>,
    },
    {
      title: t('settings.data.logStatus'),
      dataIndex: 'success',
      width: 70,
      render: (v: boolean) => v
        ? <Text type="success">{t('settings.data.logSuccess')}</Text>
        : <Text type="danger">{t('settings.data.logFailed')}</Text>,
    },
    {
      title: t('settings.data.logTime'),
      dataIndex: 'createdAt',
      width: 150,
      render: (v: string) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {formatDateTime(v)}
        </Text>
      ),
    },
  ]

  return (
    <div style={{ maxWidth: 800 }}>
      <SectionTitle>{t('settings.data.sectionImport')}</SectionTitle>

      <Alert
        type="info"
        showIcon
        message={t('settings.data.importInfo')}
        description={
          <ul style={{ margin: '4px 0 0', paddingLeft: 18, fontSize: 13 }}>
            <li>{t('settings.data.importDesc1')}</li>
            <li>{t('settings.data.importDesc2')}</li>
            <li>{t('settings.data.importDesc3')}</li>
          </ul>
        }
        style={{ marginBottom: 16 }}
      />

      <Space>
        <Upload {...uploadProps}>
          <Button icon={<UploadOutlined />}>{t('settings.data.importButton')}</Button>
        </Upload>
        <Button onClick={() => window.open('/api/v1/data/import-template', '_blank')}>
          {t('settings.data.downloadTemplate')}
        </Button>
      </Space>

      <Divider />

      <SectionTitle>{t('settings.data.sectionExport')}</SectionTitle>

      <Paragraph type="secondary" style={{ marginBottom: 16 }}>
        {t('settings.data.exportDesc')}
      </Paragraph>

      <Button type="primary" icon={<DownloadOutlined />} loading={exporting} onClick={handleExport}>
        {t('settings.data.exportButton')}
      </Button>

      <Divider />

      <SectionTitle>{t('settings.data.sectionLogs')}</SectionTitle>

      <Table
        rowKey="id"
        columns={logColumns}
        dataSource={logs}
        loading={logsLoading}
        pagination={{
          current: logsPage,
          pageSize: 20,
          total: logsTotal,
          onChange: fetchLogs,
          showTotal: (total) => t('common.total', { count: total }),
        }}
        size="small"
        scroll={{ x: 700 }}
        style={{ borderRadius: 8, overflow: 'hidden' }}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// 5. 国际化配置 tab (PRD v1.8 - 5.8)
// ---------------------------------------------------------------------------

const I18nConfigTab: React.FC = () => {
  const [form] = Form.useForm<I18nConfig>()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { t } = useTranslation()

  const allLanguages = [
    { value: 'zh', label: '简体中文（Simplified Chinese）' },
    { value: 'en', label: 'English（英文）' },
    { value: 'zh-HK', label: '繁體中文（Traditional Chinese）' },
    { value: 'ja', label: '日本語（Japanese）' },
    { value: 'ko', label: '한국어（Korean）' },
    { value: 'vi', label: 'Tiếng Việt（Vietnamese）' },
    { value: 'th', label: 'ภาษาไทย（Thai）' },
  ]

  useEffect(() => {
    request
      .get<I18nConfig>('/settings/i18n')
      .then((res) => {
        const data = res.data ?? {}
        form.setFieldsValue({
          defaultLanguage: (data as any).defaultLanguage ?? 'zh',
          supportedLanguages: (data as any).supportedLanguages ?? ['zh', 'en'],
          dateFormat: (data as any).dateFormat ?? 'YYYY-MM-DD',
          timeFormat: (data as any).timeFormat ?? '24h',
          currency: (data as any).currency ?? 'CNY',
          numberFormat: (data as any).numberFormat ?? 'comma',
          timezone: (data as any).timezone ?? 'Asia/Shanghai',
        })
      })
      .catch(() => {
        // Use defaults if not configured yet
        form.setFieldsValue({
          defaultLanguage: 'zh',
          supportedLanguages: ['zh', 'en'],
          dateFormat: 'YYYY-MM-DD',
          timeFormat: '24h',
          currency: 'CNY',
          numberFormat: 'comma',
          timezone: 'Asia/Shanghai',
        })
      })
      .finally(() => setLoading(false))
  }, [form])

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      setSaving(true)
      await request.put('/settings/i18n', values)
      // Apply language change if default language changed
      const currentLang = i18n.language?.split('-')[0] ?? 'zh'
      if (values.defaultLanguage && values.defaultLanguage !== currentLang) {
        i18n.changeLanguage(values.defaultLanguage)
      }
      message.success(t('settings.i18n.saveSuccess'))
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'errorFields' in err) return
      message.error(t('common.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <Spin />
      </div>
    )
  }

  return (
    <Form form={form} layout="vertical" style={{ maxWidth: 640 }}>
      <SectionTitle>{t('settings.i18n.sectionLanguage')}</SectionTitle>

      <Form.Item
        name="defaultLanguage"
        label={t('settings.i18n.defaultLanguage')}
        extra={t('settings.i18n.defaultLanguageExtra')}
        rules={[{ required: true }]}
      >
        <Select
          options={allLanguages.slice(0, 2)} // Phase 1: only zh and en
          style={{ maxWidth: 320 }}
        />
      </Form.Item>

      <Form.Item
        name="supportedLanguages"
        label={t('settings.i18n.supportedLanguages')}
        extra={t('settings.i18n.supportedLanguagesExtra')}
      >
        <Checkbox.Group>
          <Space direction="vertical">
            {allLanguages.map((lang) => (
              <Checkbox
                key={lang.value}
                value={lang.value}
                disabled={['zh', 'en'].includes(lang.value) ? false : true}
              >
                {lang.label}
                {!['zh', 'en'].includes(lang.value) && (
                  <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                    (Phase 2)
                  </Text>
                )}
              </Checkbox>
            ))}
          </Space>
        </Checkbox.Group>
      </Form.Item>

      <SectionTitle>{t('settings.i18n.sectionFormat')}</SectionTitle>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="dateFormat"
            label={t('settings.i18n.dateFormat')}
            extra={t('settings.i18n.dateFormatExtra')}
          >
            <Select
              options={[
                { label: 'YYYY-MM-DD（2026-03-09）', value: 'YYYY-MM-DD' },
                { label: 'DD/MM/YYYY（09/03/2026）', value: 'DD/MM/YYYY' },
                { label: 'MM/DD/YYYY（03/09/2026）', value: 'MM/DD/YYYY' },
                { label: 'YYYY年MM月DD日', value: 'YYYY年MM月DD日' },
              ]}
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="timeFormat" label={t('settings.i18n.timeFormat')}>
            <Radio.Group>
              <Space direction="vertical">
                <Radio value="24h">{t('settings.i18n.timeFormat24h')}</Radio>
                <Radio value="12h">{t('settings.i18n.timeFormat12h')}</Radio>
              </Space>
            </Radio.Group>
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="currency"
            label={t('settings.i18n.currency')}
            extra={t('settings.i18n.currencyExtra')}
          >
            <Select
              options={[
                { label: '¥ 人民币 (CNY)', value: 'CNY' },
                { label: 'HK$ 港币 (HKD)', value: 'HKD' },
                { label: '$ 美元 (USD)', value: 'USD' },
                { label: '€ 欧元 (EUR)', value: 'EUR' },
              ]}
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="numberFormat" label={t('settings.i18n.numberFormat')}>
            <Radio.Group>
              <Space direction="vertical">
                <Radio value="comma">{t('settings.i18n.numberFormatComma')}</Radio>
                <Radio value="space">{t('settings.i18n.numberFormatSpace')}</Radio>
              </Space>
            </Radio.Group>
          </Form.Item>
        </Col>
      </Row>

      <SectionTitle>{t('settings.i18n.sectionTimezone')}</SectionTitle>

      <Form.Item
        name="timezone"
        label={t('settings.i18n.timezone')}
        extra={t('settings.i18n.timezoneExtra')}
        rules={[{ required: true }]}
      >
        <Select
          style={{ maxWidth: 320 }}
          options={[
            { label: 'Asia/Shanghai（UTC+8，北京/上海）', value: 'Asia/Shanghai' },
            { label: 'Asia/Hong_Kong（UTC+8，香港）', value: 'Asia/Hong_Kong' },
            { label: 'Asia/Tokyo（UTC+9，东京）', value: 'Asia/Tokyo' },
            { label: 'Asia/Seoul（UTC+9，首尔）', value: 'Asia/Seoul' },
            { label: 'Asia/Singapore（UTC+8，新加坡）', value: 'Asia/Singapore' },
            { label: 'UTC（UTC+0）', value: 'UTC' },
            { label: 'America/New_York（UTC-5，纽约）', value: 'America/New_York' },
            { label: 'Europe/London（UTC+0，伦敦）', value: 'Europe/London' },
          ]}
        />
      </Form.Item>

      <Form.Item>
        <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSave}>
          {t('common.save')}
        </Button>
      </Form.Item>
    </Form>
  )
}

// ---------------------------------------------------------------------------
// Root Settings page
// ---------------------------------------------------------------------------

const Settings: React.FC = () => {
  const { t } = useTranslation()

  const tabItems = [
    {
      key: 'basic',
      label: (
        <Space>
          <SettingOutlined />
          {t('settings.tabs.basic')}
        </Space>
      ),
      children: <BasicConfigTab />,
    },
    {
      key: 'notifications',
      label: (
        <Space>
          <BellOutlined />
          {t('settings.tabs.notifications')}
        </Space>
      ),
      children: <NotificationConfigTab />,
    },
    {
      key: 'integrations',
      label: (
        <Space>
          <ApiOutlined />
          {t('settings.tabs.integrations')}
        </Space>
      ),
      children: <IntegrationConfigTab />,
    },
    {
      key: 'data',
      label: (
        <Space>
          <DatabaseOutlined />
          {t('settings.tabs.data')}
        </Space>
      ),
      children: <DataManagementTab />,
    },
    {
      key: 'i18n',
      label: (
        <Space>
          <GlobalOutlined />
          {t('settings.tabs.i18n')}
        </Space>
      ),
      children: <I18nConfigTab />,
    },
  ]

  return (
    <div style={{ padding: 24, background: '#f5f5f5', minHeight: '100vh' }}>
      <PageHeader
        title={t('settings.title')}
        subtitle={t('settings.subtitle')}
        breadcrumbs={[{ title: '系统管理' }, { title: t('settings.title') }]}
      />
      <div style={{ background: '#fff', borderRadius: 10, padding: '16px 20px' }}>
        <Tabs defaultActiveKey="basic" items={tabItems} />
      </div>
    </div>
  )
}

export default Settings
