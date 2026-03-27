import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import zhCN from './locales/zh-CN.json'
import enUS from './locales/en-US.json'
import ug from './locales/ug.json'

export const SUPPORTED_LANGUAGES = [
  { value: 'zh', label: '简体中文' },
  { value: 'en', label: 'English' },
  { value: 'ug', label: 'ئۇيغۇرچە' },
] as const

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]['value']

export const DEFAULT_LANGUAGE: SupportedLanguage = 'zh'

/** Languages that require right-to-left layout */
export const RTL_LANGUAGES = ['ug', 'ar', 'he', 'fa']

export const isRtlLanguage = (lang: string) => RTL_LANGUAGES.includes(lang.split('-')[0])

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      zh: { translation: zhCN },
      en: { translation: enUS },
      ug: { translation: ug },
    },
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: ['zh', 'en', 'ug'],
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'mdos_lang',
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false,
    },
  })

export default i18n
