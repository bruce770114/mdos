import React, { useEffect, useState } from 'react'
import { Table, Button, Space, Modal, Form, Input, Select, Switch, InputNumber, Drawer, message } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { useTranslation } from 'react-i18next'
import request from '@/utils/request'
import type { LlmProvider, LlmProviderType } from '@/types'

type ProviderFormValues = Omit<LlmProvider, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>

export const LlmProviderPage: React.FC = () => {
  const { t } = useTranslation()
  const [providers, setProviders] = useState<LlmProvider[]>([])
  const [loading, setLoading] = useState(false)
  const [drawerVisible, setDrawerVisible] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form] = Form.useForm()

  // Defined inside component so labels update on language change
  const PROVIDER_TYPES: { label: string; value: LlmProviderType }[] = [
    { label: 'OpenAI', value: 'openai' },
    { label: 'Anthropic', value: 'anthropic' },
    { label: t('llmModels.providerTypeTongyi'), value: 'tongyi' },
    { label: 'Qwen', value: 'qwen' },
    { label: t('llmModels.providerTypeCustom'), value: 'custom' },
  ]

  const columns: ColumnsType<LlmProvider> = [
    { title: t('llmModels.providerName'), dataIndex: 'name', key: 'name' },
    {
      title: t('llmModels.providerType'),
      dataIndex: 'providerType',
      key: 'providerType',
      render: (type: LlmProviderType) =>
        PROVIDER_TYPES.find(p => p.value === type)?.label || type,
    },
    {
      title: t('llmModels.apiKey'),
      dataIndex: 'apiKey',
      key: 'apiKey',
      render: () => '••••••••',
    },
    {
      title: t('common.status'),
      dataIndex: 'enabled',
      key: 'enabled',
      render: (enabled: boolean) => <Switch checked={enabled} disabled />,
    },
    {
      title: t('llmModels.priority'),
      dataIndex: 'priority',
      key: 'priority',
    },
    {
      title: t('llmModels.actions'),
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEditProvider(record)}
          >
            {t('common.edit')}
          </Button>
          <Button
            danger
            size="small"
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteProvider(record.id)}
          >
            {t('common.delete')}
          </Button>
        </Space>
      ),
    },
  ]

  const fetchProviders = async () => {
    setLoading(true)
    try {
      const response = await request.get<LlmProvider[]>('/api/v1/llm-providers')
      setProviders(response.data || [])
    } catch {
      message.error(t('llmModels.providerLoadFailed'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProviders()
  }, [])

  const handleAddProvider = () => {
    setEditingId(null)
    form.resetFields()
    setDrawerVisible(true)
  }

  const handleEditProvider = (provider: LlmProvider) => {
    setEditingId(provider.id)
    form.setFieldsValue(provider)
    setDrawerVisible(true)
  }

  const handleDeleteProvider = (id: string) => {
    Modal.confirm({
      title: t('llmModels.deleteProvider'),
      content: t('llmModels.deleteProviderConfirm'),
      okText: t('common.delete'),
      okType: 'danger',
      cancelText: t('common.cancel'),
      onOk: async () => {
        try {
          await request.delete(`/api/v1/llm-providers/${id}`)
          message.success(t('llmModels.providerDeleteSuccess'))
          fetchProviders()
        } catch {
          message.error(t('llmModels.providerDeleteFailed'))
        }
      },
    })
  }

  const handleSubmit = async (values: ProviderFormValues) => {
    try {
      if (editingId) {
        await request.put(`/api/v1/llm-providers/${editingId}`, values)
      } else {
        await request.post('/api/v1/llm-providers', values)
      }
      message.success(t('llmModels.providerSaveSuccess'))
      setDrawerVisible(false)
      fetchProviders()
    } catch {
      message.error(t('llmModels.providerSaveFailed'))
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAddProvider}>
          {t('llmModels.newProvider')}
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={providers}
        loading={loading}
        rowKey="id"
        pagination={{ pageSize: 20 }}
      />

      <Drawer
        title={editingId ? t('llmModels.editProvider') : t('llmModels.newProvider')}
        placement="right"
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        width={500}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            label={t('llmModels.providerName')}
            name="name"
            rules={[{ required: true, message: t('llmModels.providerNameRequired') }]}
          >
            <Input placeholder={t('llmModels.providerNamePlaceholder')} />
          </Form.Item>

          <Form.Item
            label={t('llmModels.providerType')}
            name="providerType"
            rules={[{ required: true, message: t('llmModels.providerTypeRequired') }]}
          >
            <Select options={PROVIDER_TYPES} />
          </Form.Item>

          <Form.Item
            label={t('llmModels.apiKey')}
            name="apiKey"
            rules={[{ required: true, message: t('llmModels.apiKeyRequired') }]}
          >
            <Input.Password placeholder={t('llmModels.apiKeyPlaceholder')} />
          </Form.Item>

          <Form.Item label={t('llmModels.apiEndpoint')} name="apiEndpoint">
            <Input placeholder={t('llmModels.apiEndpointPlaceholder')} />
          </Form.Item>

          <Form.Item label={t('llmModels.priority')} name="priority" initialValue={0}>
            <InputNumber min={0} />
          </Form.Item>

          <Form.Item
            label={t('common.enable')}
            name="enabled"
            valuePropName="checked"
            initialValue={true}
          >
            <Switch />
          </Form.Item>

          <Form.Item label={t('common.description')} name="description">
            <Input.TextArea rows={3} placeholder={t('llmModels.descriptionPlaceholder')} />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {t('common.save')}
              </Button>
              <Button onClick={() => setDrawerVisible(false)}>
                {t('common.cancel')}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  )
}

export default LlmProviderPage
