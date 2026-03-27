import React, { useState } from 'react'
import { Card, Tabs } from 'antd'
import { useTranslation } from 'react-i18next'
import LlmProviderPage from './LlmProviderPage'
import LlmModelPage from './LlmModelPage'

export const LlmSettingsPage: React.FC = () => {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState('providers')

  return (
    <Card title={t('llmModels.title')} style={{ margin: '20px' }}>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'providers',
            label: t('llmModels.providers'),
            children: <LlmProviderPage />,
          },
          {
            key: 'models',
            label: t('llmModels.models'),
            children: <LlmModelPage />,
          },
        ]}
      />
    </Card>
  )
}

export default LlmSettingsPage
