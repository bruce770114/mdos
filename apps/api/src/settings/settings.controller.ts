import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Param,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SettingsService } from './settings.service';

class UpdateSettingDto {
  @ApiProperty({ description: 'New value for the setting (any JSON-compatible type)' })
  @IsNotEmpty()
  value: unknown;
}

@ApiTags('Settings')
@ApiBearerAuth()
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all settings grouped by category' })
  getAll(@Request() req: any) {
    return this.settingsService.getAll(req.user.tenantId);
  }

  // ── Business-specific flat-object endpoints (used by frontend) ─────────────

  @Get('basic')
  @ApiOperation({ summary: 'Get basic config as flat object' })
  async getBasic(@Request() req: any) {
    const [general, lease] = await Promise.all([
      this.settingsService.getCategoryMap('general', req.user.tenantId),
      this.settingsService.getCategoryMap('lease', req.user.tenantId),
    ]);
    return {
      companyName: general['companyName'] ?? '',
      systemName: general['systemName'] ?? 'MDOS',
      logoUrl: general['logoUrl'] ?? '',
      timezone: general['timezone'] ?? 'Asia/Shanghai',
      currency: general['currency'] ?? 'CNY',
      contractExpiryReminders: (general['contractExpiryReminders'] as number[]) ?? [30, 60, 90],
      billingDay: lease['rentDueDayOfMonth'] ?? 1,
    };
  }

  @Put('basic')
  @ApiOperation({ summary: 'Save basic config from flat object' })
  @HttpCode(HttpStatus.OK)
  async setBasic(@Body() dto: Record<string, unknown>, @Request() req: any) {
    const tenantId = req.user.tenantId;
    const { billingDay, contractExpiryReminders, ...generalFields } = dto as any;
    await Promise.all([
      this.settingsService.setCategoryMap('general', {
        ...generalFields,
        contractExpiryReminders: contractExpiryReminders ?? [30, 60, 90],
      }, tenantId),
      this.settingsService.setCategoryMap('lease', {
        rentDueDayOfMonth: billingDay ?? 1,
      }, tenantId),
    ]);
    return { ok: true };
  }

  @Get('notifications')
  @ApiOperation({ summary: 'Get notification config as flat object' })
  async getNotifications(@Request() req: any) {
    return this.settingsService.getCategoryMap('notification', req.user.tenantId);
  }

  @Put('notifications')
  @ApiOperation({ summary: 'Save notification config from flat object' })
  @HttpCode(HttpStatus.OK)
  async setNotifications(@Body() dto: Record<string, unknown>, @Request() req: any) {
    await this.settingsService.setCategoryMap('notification', dto, req.user.tenantId);
    return { ok: true };
  }

  @Get('integrations')
  @ApiOperation({ summary: 'Get integrations config as flat object' })
  async getIntegrations(@Request() req: any) {
    return this.settingsService.getCategoryMap('integration', req.user.tenantId);
  }

  @Put('integrations')
  @ApiOperation({ summary: 'Save integrations config from flat object' })
  @HttpCode(HttpStatus.OK)
  async setIntegrations(@Body() dto: Record<string, unknown>, @Request() req: any) {
    await this.settingsService.setCategoryMap('integration', dto, req.user.tenantId);
    return { ok: true };
  }

  @Post('integrations/smtp/test')
  @ApiOperation({ summary: 'Test SMTP connection' })
  @HttpCode(HttpStatus.OK)
  async testSmtp(@Body() _dto: Record<string, unknown>, @Request() _req: any) {
    // TODO: implement actual SMTP test
    return { ok: true, message: 'SMTP connection test passed (stub)' };
  }

  @Get('i18n')
  @ApiOperation({ summary: 'Get i18n config as flat object' })
  async getI18n(@Request() req: any) {
    return this.settingsService.getCategoryMap('i18n', req.user.tenantId);
  }

  @Put('i18n')
  @ApiOperation({ summary: 'Save i18n config from flat object' })
  @HttpCode(HttpStatus.OK)
  async setI18n(@Body() dto: Record<string, unknown>, @Request() req: any) {
    await this.settingsService.setCategoryMap('i18n', dto, req.user.tenantId);
    return { ok: true };
  }

  // ── Generic key-value endpoints ────────────────────────────────────────────

  @Get(':category')
  @ApiOperation({ summary: 'Get all settings for a specific category' })
  @ApiParam({ name: 'category', description: 'Setting category, e.g. general, lease, finance' })
  getByCategory(
    @Param('category') category: string,
    @Request() req: any,
  ) {
    return this.settingsService.getByCategory(category, req.user.tenantId);
  }

  @Put(':category/:key')
  @ApiOperation({ summary: 'Create or update a single setting value' })
  @ApiParam({ name: 'category', description: 'Setting category' })
  @ApiParam({ name: 'key', description: 'Setting key within the category' })
  @ApiBody({ type: UpdateSettingDto })
  @HttpCode(HttpStatus.OK)
  set(
    @Param('category') category: string,
    @Param('key') key: string,
    @Body() dto: UpdateSettingDto,
    @Request() req: any,
  ) {
    return this.settingsService.set(category, key, dto.value, req.user.tenantId);
  }
}
