import React, { useEffect, useState } from 'react'
import { Table, Button, Space, Modal, Form, Input, Select, Switch, InputNumber, Drawer, message, Row, Col, Tag } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { useTranslation } from 'react-i18next'
import request from '@/utils/request'
import type { LlmModel, LlmProvider, AiTaskType } from '@/types'

type ModelFormValues = Omit<LlmModel, 'id' | 'tenantId' | 'createdAt' | 'updatedAt' | 'provider'>

export const LlmModelPage: React.FC = () => {
  const { t } = useTranslation()
  const [models, setModels] = useState<LlmModel[]>([])
  const [providers, setProviders] = useState<LlmProvider[]>([])
  const [loading, setLoading] = useState(false)
  const [drawerVisible, setDrawerVisible] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form] = Form.useForm()

  // Defined inside component so labels update on language change
  const AI_TASK_TYPES: { label: string; value: AiTaskType }[] = [
    { label: t('llmModels.taskContractParsing'), value: 'contract_parsing' },
    { label: t('llmModels.taskCustomerAnalysis'), value: 'customer_analysis' },
    { label: t('llmModels.taskBillGeneration'), value: 'bill_generation' },
    { label: t('llmModels.taskDocumentOcr'), value: 'document_ocr' },
    { label: t('llmModels.taskDataSummarization'), value: 'data_summarization' },
    { label: t('llmModels.taskOther'), value: 'other' },
  ]

  const columns: ColumnsType<LlmModel> = [
    { title: t('llmModels.modelId'), dataIndex: 'modelId', key: 'modelId' },
    { title: t('llmModels.modelName'), dataIndex: 'modelName', key: 'modelName' },
    {
      title: t('llmModels.provider'),
      dataIndex: 'llmProviderId',
      key: 'llmProviderId',
      render: (providerId: string) =>
        providers.find(p => p.id === providerId)?.name || providerId,
    },
    {
      title: t('llmModels.aiTaskType'),
      dataIndex: 'aiTaskType',
      key: 'aiTaskType',
      render: (taskType: AiTaskType) =>
        AI_TASK_TYPES.find(t => t.value === taskType)?.label || taskType,
    },
    {
      title: t('llmModels.isDefault'),
      dataIndex: 'isDefault',
      key: 'isDefault',
      render: (isDefault: boolean) =>
        isDefault
          ? <Tag color="green">{t('llmModels.defaultModel')}</Tag>
          : <Tag>{t('llmModels.notDefault')}</Tag>,
    },
    {
      title: t('common.status'),
      dataIndex: 'enabled',
      key: 'enabled',
      render: (enabled: boolean) =>
        enabled
          ? <Tag color="blue">{t('common.active')}</Tag>
          : <Tag>{t('common.inactive')}</Tag>,
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
            onClick={() => handleEditModel(record)}
          >
            {t('common.edit')}
          </Button>
          <Button
            danger
            size="small"
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteModel(record.id)}
          >
            {t('common.delete')}
          </Button>
        </Space>
      ),
    },
  ]

  const fetchData = async () => {
    setLoading(true)
    try {
      const [modelsResponse, providersResponse] = await Promise.all([
        request.get<LlmModel[]>('/api/v1/llm-models'),
        request.get<LlmProvider[]>('/api/v1/llm-providers'),
      ])
      setModels(modelsResponse.data || [])
      setProviders(providersResponse.data || [])
    } catch {
      message.error(t('llmModels.modelLoadFailed'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleAddModel = () => {
    setEditingId(null)
    form.resetFields()
    setDrawerVisible(true)
  }

  const handleEditModel = (model: LlmModel) => {
    setEditingId(model.id)
    form.setFieldsValue(model)
    setDrawerVisible(true)
  }

  const handleDeleteModel = (id: string) => {
    Modal.confirm({
      title: t('llmModels.deleteModel'),
      content: t('llmModels.deleteModelConfirm'),
      okText: t('common.delete'),
      okType: 'danger',
      cancelText: t('common.cancel'),
      onOk: async () => {
        try {
          await request.delete(`/api/v1/llm-models/${id}`)
          message.success(t('llmModels.modelDeleteSuccess'))
          fetchData()
        } catch {
          message.error(t('llmModels.modelDeleteFailed'))
        }
      },
    })
  }

  const handleSubmit = async (values: ModelFormValues) => {
    try {
      if (editingId) {
        await request.put(`/api/v1/llm-models/${editingId}`, values)
      } else {
        await request.post('/api/v1/llm-models', values)
      }
      message.success(t('llmModels.modelSaveSuccess'))
      setDrawerVisible(false)
      fetchData()
    } catch {
      message.error(t('llmModels.modelSaveFailed'))
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAddModel}>
          {t('llmModels.newModel')}
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={models}
        loading={loading}
        rowKey="id"
        pagination={{ pageSize: 20 }}
      />

      <Drawer
        title={editingId ? t('llmModels.editModel') : t('llmModels.newModel')}
        placement="right"
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            label={t('llmModels.provider')}
            name="llmProviderId"
            rules={[{ required: true, message: t('llmModels.providerRequired') }]}
          >
            <Select
              placeholder={t('llmModels.selectProviderPlaceholder')}
              options={providers.map(p => ({ label: p.name, value: p.id }))}
            />
          </Form.Item>

          <Form.Item
            label={t('llmModels.modelId')}
            name="modelId"
            rules={[{ required: true, message: t('llmModels.modelIdRequired') }]}
          >
            <Input placeholder={t('llmModels.modelIdPlaceholder')} />
          </Form.Item>

          <Form.Item
            label={t('llmModels.modelName')}
            name="modelName"
            rules={[{ required: true, message: t('llmModels.modelNameRequired') }]}
          >
            <Input placeholder={t('llmModels.modelNamePlaceholder')} />
          </Form.Item>

          <Form.Item
            label={t('llmModels.aiTaskType')}
            name="aiTaskType"
            rules={[{ required: true, message: t('llmModels.taskTypeRequired') }]}
          >
            <Select options={AI_TASK_TYPES} />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label={t('llmModels.isDefault')}
                name="isDefault"
                valuePropName="checked"
                initialValue={false}
              >
                <Switch />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label={t('common.enable')}
                name="enabled"
                valuePropName="checked"
                initialValue={true}
              >
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label={t('llmModels.maxInputTokens')} name="maxInputTokens">
                <InputNumber style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label={t('llmModels.maxOutputTokens')} name="maxOutputTokens">
                <InputNumber style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label={t('llmModels.priority')} name="priority" initialValue={0}>
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

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

export default LlmModelPage
