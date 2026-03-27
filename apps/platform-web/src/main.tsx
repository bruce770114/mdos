import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import enUS from 'antd/locale/en_US'
import type { Locale } from 'antd/lib/locale'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import 'dayjs/locale/en'
import { store } from './store'
import App from './App'
import './index.css'
import './i18n'
import i18n, { isRtlLanguage } from './i18n'

const antdLocaleMap: Record<string, Locale> = {
  zh: zhCN,
  en: enUS,
  ug: enUS, // Ant Design has no built-in Uyghur locale; use enUS as fallback
}

const dayjsLocaleMap: Record<string, string> = {
  zh: 'zh-cn',
  en: 'en',
  ug: 'en', // dayjs has no Uyghur locale; fall back to en
}

const Root: React.FC = () => {
  const currentLang = i18n.language?.split('-')[0] ?? 'zh'

  const [antdLocale, setAntdLocale] = useState<Locale>(
    antdLocaleMap[currentLang] ?? zhCN,
  )
  const [direction, setDirection] = useState<'ltr' | 'rtl'>(
    isRtlLanguage(currentLang) ? 'rtl' : 'ltr',
  )

  useEffect(() => {
    const handleLangChange = (lng: string) => {
      const lang = lng.split('-')[0]
      setAntdLocale(antdLocaleMap[lang] ?? enUS)
      dayjs.locale(dayjsLocaleMap[lang] ?? 'en')
      const dir = isRtlLanguage(lang) ? 'rtl' : 'ltr'
      setDirection(dir)
      document.documentElement.dir = dir
      document.documentElement.lang = lang
    }

    // Apply on mount
    const lang = currentLang
    dayjs.locale(dayjsLocaleMap[lang] ?? 'en')
    document.documentElement.dir = isRtlLanguage(lang) ? 'rtl' : 'ltr'
    document.documentElement.lang = lang

    i18n.on('languageChanged', handleLangChange)
    return () => {
      i18n.off('languageChanged', handleLangChange)
    }
  }, [])

  return (
    <Provider store={store}>
      <BrowserRouter>
        <ConfigProvider
          locale={antdLocale}
          direction={direction}
          theme={{ token: { colorPrimary: '#1677ff' } }}
        >
          <App />
        </ConfigProvider>
      </BrowserRouter>
    </Provider>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(<Root />)
