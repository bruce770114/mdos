import { Injectable } from '@nestjs/common';

export interface I18nMessages {
  [key: string]: string | I18nMessages;
}

const messages: Record<string, I18nMessages> = {
  zh: {
    // Common
    'common.success': '操作成功',
    'common.error': '操作失败',
    'common.notFound': '资源不存在',
    'common.unauthorized': '未授权',
    'common.forbidden': '禁止访问',
    'common.validationError': '验证失败',
    'common.serverError': '服务器错误',

    // Auth
    'auth.loginSuccess': '登录成功',
    'auth.loginFailed': '用户名或密码错误',
    'auth.tokenExpired': '令牌已过期',
    'auth.tokenInvalid': '令牌无效',

    // Tenant
    'tenant.notFound': '租户不存在',
    'tenant.noSpace': '租户未分配存储空间',
    'tenant.suspended': '租户已停用',

    // Space
    'space.notFound': '存储空间不存在',
    'space.full': '存储空间已满',
    'space.locked': '存储空间已锁定',
  },
  en: {
    // Common
    'common.success': 'Success',
    'common.error': 'Operation failed',
    'common.notFound': 'Resource not found',
    'common.unauthorized': 'Unauthorized',
    'common.forbidden': 'Forbidden',
    'common.validationError': 'Validation failed',
    'common.serverError': 'Server error',

    // Auth
    'auth.loginSuccess': 'Login successful',
    'auth.loginFailed': 'Invalid username or password',
    'auth.tokenExpired': 'Token expired',
    'auth.tokenInvalid': 'Invalid token',

    // Tenant
    'tenant.notFound': 'Tenant not found',
    'tenant.noSpace': 'Tenant has no storage space assigned',
    'tenant.suspended': 'Tenant is suspended',

    // Space
    'space.notFound': 'Storage space not found',
    'space.full': 'Storage space is full',
    'space.locked': 'Storage space is locked',
  },
  ug: {
    // Common
    'common.success': 'مەغلۇبيى ئۇتۇق',
    'common.error': 'مەغلۇبيى ئۇتۇقسىز',
    'common.notFound': 'بايقۇلمايدۇ',
    'common.unauthorized': 'ئىجازەتسىز',
    'common.forbidden': 'چەكلەنگەن',
    'common.validationError': 'دەلىللەش خاتا',
    'common.serverError': 'مۇلازىمەت خاتا',

    // Auth
    'auth.loginSuccess': 'كىرىش مۇۋەپپىياتى',
    'auth.loginFailed': 'ئىشلەتكۈچى ياكى پارول خاتا',
    'auth.tokenExpired': 'بەلگىلىك ۋاقىت ئۆتۈپ كەتتى',
    'auth.tokenInvalid': 'بەلگىلىكىمۇ',

    // Tenant
    'tenant.notFound': 'ئىجارىدار بايقۇلمايدۇ',
    'tenant.noSpace': 'ئىجارىدارغا ساقلاش بوشلۇقى تە назнаسىز',
    'tenant.suspended': 'ئىجارىدار توختىتىلدى',

    // Space
    'space.notFound': 'ساقلاش بوشلۇقى بايقۇلمايدۇ',
    'space.full': 'ساقلاش بوشلۇقى تولدى',
    'space.locked': 'ساقلاش بوشلۇقى قۇلۇقلاندى',
  },
};

export const SUPPORTED_LANGUAGES = [
  { value: 'zh', label: '简体中文' },
  { value: 'en', label: 'English' },
  { value: 'ug', label: 'ئۇيغۇرچە' },
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]['value'];
export const DEFAULT_LANGUAGE: SupportedLanguage = 'zh';

/**
 * Backend i18n service
 *
 * Provides message translation based on Accept-Language header
 */
@Injectable()
export class I18nService {
  /**
   * Get translation for a key
   */
  t(key: string, lang?: string): string {
    const language = lang || DEFAULT_LANGUAGE;
    const langMessages = messages[language] || messages[DEFAULT_LANGUAGE];

    return this.getNestedValue(langMessages, key) || key;
  }

  /**
   * Get translation with fallback
   */
  translate(key: string, lang?: string): string {
    const language = lang || DEFAULT_LANGUAGE;

    // Try primary language
    const translated = this.t(key, language);
    if (translated !== key) {
      return translated;
    }

    // Fallback to default language
    return this.t(key, DEFAULT_LANGUAGE);
  }

  /**
   * Parse Accept-Language header and return language code
   */
  parseAcceptLanguage(acceptLanguage?: string): SupportedLanguage {
    if (!acceptLanguage) {
      return DEFAULT_LANGUAGE;
    }

    // Parse: zh-CN,zh;q=0.9,en;q=0.8
    const languages = acceptLanguage
      .split(',')
      .map((item) => item.trim().split(';')[0]);

    for (const lang of languages) {
      // Exact match
      if (messages[lang]) {
        return lang as SupportedLanguage;
      }
      // Partial match (e.g., zh-CN -> zh)
      const baseLang = lang.split('-')[0];
      if (messages[baseLang]) {
        return baseLang as SupportedLanguage;
      }
    }

    return DEFAULT_LANGUAGE;
  }

  /**
   * Get all translations for a language
   */
  getAll(lang?: string): I18nMessages {
    const language = lang || DEFAULT_LANGUAGE;
    return messages[language] || messages[DEFAULT_LANGUAGE];
  }

  private getNestedValue(obj: I18nMessages, path: string): string | undefined {
    const keys = path.split('.');
    let result: any = obj;

    for (const key of keys) {
      if (result && typeof result === 'object' && key in result) {
        result = result[key];
      } else {
        return undefined;
      }
    }

    return typeof result === 'string' ? result : undefined;
  }
}
