import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemSetting } from './system-setting.entity';

/** Shape for bulk-upsert of defaults: [category, key, value, description?] */
type DefaultSetting = [string, string, unknown, string?];

const DEFAULT_SETTINGS: DefaultSetting[] = [
  // ── General ────────────────────────────────────────────────────────────────
  ['general', 'companyName', '', 'Company / tenant display name'],
  ['general', 'timezone', 'Asia/Shanghai', 'System timezone'],
  ['general', 'currency', 'CNY', 'Default currency code'],
  ['general', 'dateFormat', 'YYYY-MM-DD', 'Date display format'],

  // ── Lease ──────────────────────────────────────────────────────────────────
  ['lease', 'defaultRentUnit', 'monthly', 'Default rent billing unit: monthly | daily | yearly'],
  ['lease', 'rentDueDayOfMonth', 1, 'Day of month when rent is due (1-28)'],
  ['lease', 'invoicePrefix', 'INV-', 'Prefix used when generating invoice numbers'],
  ['lease', 'depositMonths', 3, 'Default number of months for security deposit'],

  // ── Notification ────────────────────────────────────────────────────────────
  ['notification', 'contractExpiryReminderDays', 30, 'Days before contract expiry to send reminder'],
  ['notification', 'rentOverdueDays', 7, 'Days after due date before marking rent overdue'],
  ['notification', 'emailEnabled', false, 'Enable email notifications'],
  ['notification', 'smsEnabled', false, 'Enable SMS notifications'],

  // ── Finance ────────────────────────────────────────────────────────────────
  ['finance', 'taxRate', 9, 'VAT rate percentage applied to invoices'],
  ['finance', 'autoGenerateInvoice', false, 'Auto-generate invoice when rent is confirmed'],

  // ── i18n ───────────────────────────────────────────────────────────────────
  ['i18n', 'defaultLanguage', 'zh', 'Default display language for the tenant'],
  ['i18n', 'supportedLanguages', ['zh', 'en'], 'Languages available to users of this tenant'],
  ['i18n', 'dateFormat', 'YYYY-MM-DD', 'Date display format'],
  ['i18n', 'timeFormat', '24h', 'Time format: 12h or 24h'],
  ['i18n', 'currency', 'CNY', 'Default currency code for financial data'],
  ['i18n', 'numberFormat', 'comma', 'Number grouping separator: comma or space'],
  ['i18n', 'timezone', 'Asia/Shanghai', 'System timezone for display and scheduled jobs'],
];

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(SystemSetting)
    private readonly settingsRepo: Repository<SystemSetting>,
  ) {}

  async get(category: string, key: string, tenantId: string): Promise<SystemSetting> {
    const setting = await this.settingsRepo.findOne({
      where: { tenantId, category, key },
    });
    if (!setting) {
      throw new NotFoundException(`Setting ${category}.${key} not found`);
    }
    return setting;
  }

  async set(
    category: string,
    key: string,
    value: unknown,
    tenantId: string,
  ): Promise<SystemSetting> {
    let setting = await this.settingsRepo.findOne({
      where: { tenantId, category, key },
    });

    if (setting) {
      setting.value = value;
    } else {
      setting = this.settingsRepo.create({ tenantId, category, key, value });
    }

    return this.settingsRepo.save(setting);
  }

  async getByCategory(category: string, tenantId: string): Promise<SystemSetting[]> {
    return this.settingsRepo.find({
      where: { tenantId, category },
      order: { key: 'ASC' },
    });
  }

  async getAll(tenantId: string): Promise<Record<string, Record<string, unknown>>> {
    const settings = await this.settingsRepo.find({
      where: { tenantId },
      order: { category: 'ASC', key: 'ASC' },
    });

    // Group by category for a nested response map
    return settings.reduce<Record<string, Record<string, unknown>>>((acc, s) => {
      if (!acc[s.category]) {
        acc[s.category] = {};
      }
      acc[s.category][s.key] = s.value;
      return acc;
    }, {});
  }

  /**
   * Get all settings for a category as a flat key→value map (for REST convenience).
   */
  async getCategoryMap(
    category: string,
    tenantId: string,
  ): Promise<Record<string, unknown>> {
    const settings = await this.settingsRepo.find({ where: { tenantId, category } });
    return settings.reduce<Record<string, unknown>>((acc, s) => {
      acc[s.key] = s.value;
      return acc;
    }, {});
  }

  /**
   * Bulk-upsert all keys in a flat map under the given category.
   */
  async setCategoryMap(
    category: string,
    data: Record<string, unknown>,
    tenantId: string,
  ): Promise<void> {
    const existing = await this.settingsRepo.find({ where: { tenantId, category } });
    const existingMap = new Map(existing.map((s) => [s.key, s]));

    const toSave: SystemSetting[] = [];
    for (const [key, value] of Object.entries(data)) {
      const setting = existingMap.get(key);
      if (setting) {
        setting.value = value;
        toSave.push(setting);
      } else {
        toSave.push(this.settingsRepo.create({ tenantId, category, key, value }));
      }
    }
    if (toSave.length > 0) {
      await this.settingsRepo.save(toSave);
    }
  }

  /**
   * Idempotent: only inserts settings that do not yet exist for the tenant.
   * Safe to call on every tenant onboarding flow.
   */
  async initDefaults(tenantId: string): Promise<void> {
    const existing = await this.settingsRepo.find({ where: { tenantId } });
    const existingKeys = new Set(existing.map((s) => `${s.category}.${s.key}`));

    const missing = DEFAULT_SETTINGS.filter(
      ([cat, key]) => !existingKeys.has(`${cat}.${key}`),
    );

    if (missing.length === 0) return;

    const entities = missing.map(([category, key, value, description]) =>
      this.settingsRepo.create({
        tenantId,
        category,
        key,
        value,
        description: description ?? null,
      }),
    );

    await this.settingsRepo.save(entities);
  }
}
