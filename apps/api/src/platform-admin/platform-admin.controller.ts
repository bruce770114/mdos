import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, IsIn, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PlatformAdminGuard } from '../common/guards/platform-admin.guard';
import { PlatformAdminService } from './platform-admin.service';
import { TenantLifecycleStatus } from '../tenants/tenant.entity';

class CreateTenantPlatformDto {
  @ApiProperty() @IsString() @IsNotEmpty() name: string;
  @ApiProperty() @IsString() @IsNotEmpty() code: string;
  @ApiProperty() @IsString() @IsNotEmpty() slug: string;
  @ApiProperty() @IsString() @IsNotEmpty() spaceId: string;
  @ApiProperty() @IsString() @IsNotEmpty() planId: string;
  @ApiProperty() @IsString() @IsNotEmpty() adminEmail: string;
  @ApiProperty() @IsString() @IsNotEmpty() adminPassword: string;
  @ApiPropertyOptional() @IsOptional() @IsString() contactName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

class UpdateLifecycleDto {
  @ApiProperty({
    enum: ['trial', 'active', 'grace', 'suspended', 'stopped', 'cancelled'],
  })
  @IsEnum(['trial', 'active', 'grace', 'suspended', 'stopped', 'cancelled'])
  lifecycleStatus: TenantLifecycleStatus;

  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

class UpdateTenantSpaceDto {
  @ApiProperty() @IsString() @IsNotEmpty() spaceId: string;
}

class CreateSpaceDto {
  @ApiProperty() @IsString() @IsNotEmpty() spaceId: string;
  @ApiProperty() @IsString() @IsNotEmpty() name: string;
  @ApiProperty() @IsIn(['shared', 'dedicated']) type: 'shared' | 'dedicated';
  @ApiProperty() @IsString() @IsNotEmpty() dbInstance: string;
  @ApiProperty() @IsString() @IsNotEmpty() schemaName: string;
  @ApiPropertyOptional() @IsOptional() @IsString() region?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) maxTenants?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) storageLimitGB?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

class UpdateSpaceDto {
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) maxTenants?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

class CreatePlanDto {
  @ApiProperty() @IsString() @IsNotEmpty() planId: string;
  @ApiProperty() @IsString() @IsNotEmpty() name: string;
  @ApiProperty() @IsIn(['trial', 'standard', 'professional', 'enterprise']) tier: any;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) priceMonthly?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) priceYearly?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) maxUsers?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) maxProjects?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) storageGB?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) trialDays?: number;
  @ApiPropertyOptional() @IsOptional() features?: Record<string, boolean | number>;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
}

class CreateOrderDto {
  @ApiProperty() @IsString() @IsNotEmpty() tenantId: string;
  @ApiProperty() @IsString() @IsNotEmpty() planId: string;
  @ApiProperty() @IsIn(['new', 'renewal', 'upgrade', 'downgrade', 'gift']) orderType: any;
  @ApiProperty() @IsIn(['monthly', 'yearly']) billingCycle: any;
  @ApiProperty() @IsNumber() @Type(() => Number) amount: number;
  @ApiProperty() @IsString() paymentMethod: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

class AddCustomDomainDto {
  @ApiProperty() @IsString() @IsNotEmpty() domain: string;
}

class CreatePlatformAdminDto {
  @ApiProperty() @IsString() @IsNotEmpty() username: string;
  @ApiProperty() @IsString() @IsNotEmpty() email: string;
  @ApiProperty() @IsString() @IsNotEmpty() password: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
}

class UpdatePlatformAdminDto {
  @ApiPropertyOptional() @IsOptional() @IsString() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
}

class ResetPasswordDto {
  @ApiProperty() @IsString() @IsNotEmpty() newPassword: string;
}

class SetSystemConfigDto {
  @ApiProperty() @IsString() @IsNotEmpty() configKey: string;
  @ApiProperty() @IsString() @IsNotEmpty() configValue: string;
  @ApiProperty() @IsString() @IsNotEmpty() category: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() @Type(() => Boolean) isPublic?: boolean;
}

class MigrateTenantDto {
  @ApiProperty() @IsString() @IsNotEmpty() targetSpaceId: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() migrateData?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

class ChangePlanDto {
  @ApiProperty() @IsString() @IsNotEmpty() planId: string;
  @ApiProperty({ enum: ['upgrade', 'downgrade', 'renewal'] })
  @IsIn(['upgrade', 'downgrade', 'renewal'])
  changeType: 'upgrade' | 'downgrade' | 'renewal';
  @ApiProperty({ enum: ['monthly', 'yearly'] })
  @IsIn(['monthly', 'yearly'])
  billingCycle: 'monthly' | 'yearly';
  @ApiPropertyOptional() @IsOptional() @IsString() paymentMethod?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

@ApiTags('Platform Admin')
@ApiBearerAuth()
@UseGuards(PlatformAdminGuard)
@Controller('admin')
export class PlatformAdminController {
  constructor(private readonly platformService: PlatformAdminService) {}

  // ── Dashboard ──────────────────────────────────────────────
  @Get('dashboard')
  @ApiOperation({ summary: '平台管理总览统计' })
  getDashboard() {
    return this.platformService.getDashboardStats();
  }

  @Get('revenue')
  @ApiOperation({ summary: '收入统计' })
  @ApiQuery({ name: 'period', required: false, enum: ['month', 'quarter', 'year'] })
  getRevenueStats(@Query('period') period?: 'month' | 'quarter' | 'year') {
    return this.platformService.getRevenueStats(period ?? 'month');
  }

  // ── Tenants ────────────────────────────────────────────────
  @Get('tenants')
  @ApiOperation({ summary: '租户列表' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'lifecycleStatus', required: false })
  @ApiQuery({ name: 'planId', required: false })
  listTenants(
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('search') search?: string,
    @Query('lifecycleStatus') lifecycleStatus?: TenantLifecycleStatus,
    @Query('planId') planId?: string,
  ) {
    return this.platformService.listTenants({
      page: page ? +page : 1,
      pageSize: pageSize ? +pageSize : 20,
      search,
      lifecycleStatus,
      planId,
    });
  }

  @Get('tenants/:id')
  @ApiOperation({ summary: '租户详情' })
  getTenantDetail(@Param('id') id: string) {
    return this.platformService.getTenantDetail(id);
  }

  @Post('tenants')
  @ApiOperation({ summary: '创建租户' })
  createTenant(@Body() dto: CreateTenantPlatformDto) {
    return this.platformService.createTenant(dto);
  }

  @Patch('tenants/:id/lifecycle')
  @ApiOperation({ summary: '变更租户生命周期状态' })
  @HttpCode(HttpStatus.OK)
  updateLifecycle(@Param('id') id: string, @Body() dto: UpdateLifecycleDto) {
    return this.platformService.updateTenantLifecycle(id, dto.lifecycleStatus, dto.notes);
  }

  @Patch('tenants/:id/space')
  @ApiOperation({ summary: '变更租户存储空间' })
  @HttpCode(HttpStatus.OK)
  updateTenantSpace(@Param('id') id: string, @Body() dto: UpdateTenantSpaceDto) {
    return this.platformService.updateTenantSpace(id, dto.spaceId);
  }

  @Post('tenants/:id/domains')
  @ApiOperation({ summary: '为租户添加自定义域名' })
  addCustomDomain(@Param('id') id: string, @Body() dto: AddCustomDomainDto) {
    return this.platformService.addCustomDomain(id, dto.domain);
  }

  @Get('tenants/:id/domains')
  @ApiOperation({ summary: '租户域名列表' })
  listDomains(@Param('id') id: string) {
    return this.platformService.listDomains(id);
  }

  // ── Spaces ─────────────────────────────────────────────────
  @Get('spaces')
  @ApiOperation({ summary: '存储空间列表' })
  listSpaces() {
    return this.platformService.listSpaces();
  }

  @Get('spaces/available')
  @ApiOperation({ summary: '可用存储空间列表（创建租户时使用）' })
  getAvailableSpaces(@Query('tier') tier?: string) {
    return this.platformService.getAvailableSpaces(tier);
  }

  @Post('spaces')
  @ApiOperation({ summary: '创建存储空间' })
  createSpace(@Body() dto: CreateSpaceDto) {
    return this.platformService.createSpace({
      ...dto,
      region: dto.region ?? '华东（上海）',
    });
  }

  @Patch('spaces/:spaceId')
  @ApiOperation({ summary: '更新存储空间' })
  @HttpCode(HttpStatus.OK)
  updateSpace(@Param('spaceId') spaceId: string, @Body() dto: UpdateSpaceDto) {
    return this.platformService.updateSpace(spaceId, dto as any);
  }

  // ── Plans ──────────────────────────────────────────────────
  @Get('plans')
  @ApiOperation({ summary: '套餐列表' })
  listPlans(@Query('includeInactive') includeInactive?: string) {
    return this.platformService.listPlans(includeInactive === 'true');
  }

  @Post('plans')
  @ApiOperation({ summary: '创建套餐' })
  createPlan(@Body() dto: CreatePlanDto) {
    return this.platformService.createPlan(dto as any);
  }

  @Patch('plans/:planId')
  @ApiOperation({ summary: '更新套餐' })
  @HttpCode(HttpStatus.OK)
  updatePlan(@Param('planId') planId: string, @Body() dto: Partial<CreatePlanDto>) {
    return this.platformService.updatePlan(planId, dto as any);
  }

  // ── Orders ─────────────────────────────────────────────────
  @Get('orders')
  @ApiOperation({ summary: '订阅订单列表' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'tenantId', required: false })
  @ApiQuery({ name: 'paymentStatus', required: false })
  listOrders(
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('tenantId') tenantId?: string,
    @Query('paymentStatus') paymentStatus?: string,
  ) {
    return this.platformService.listOrders({
      page: page ? +page : 1,
      pageSize: pageSize ? +pageSize : 20,
      tenantId,
      paymentStatus,
    });
  }

  @Post('orders')
  @ApiOperation({ summary: '手动创建订阅订单' })
  createOrder(@Body() dto: CreateOrderDto, @Request() req: any) {
    return this.platformService.createOrder(dto, req.user.id);
  }

  @Patch('orders/:orderId/confirm-payment')
  @ApiOperation({ summary: '确认订单支付' })
  @HttpCode(HttpStatus.OK)
  confirmPayment(@Param('orderId') orderId: string) {
    return this.platformService.confirmOrderPayment(orderId);
  }

  @Patch('tenants/:id/plan')
  @ApiOperation({ summary: '变更租户套餐' })
  @HttpCode(HttpStatus.OK)
  changeTenantPlan(@Param('id') id: string, @Body() dto: ChangePlanDto, @Request() req: any) {
    return this.platformService.changeTenantPlan(id, dto, req.user.id);
  }

  // ── Audit Logs ─────────────────────────────────────────────────
  @Get('audit-logs')
  @ApiOperation({ summary: '平台审计日志' })
  @ApiQuery({ name: 'module', required: false })
  @ApiQuery({ name: 'action', required: false })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  queryAuditLogs(
    @Query('module') module?: string,
    @Query('action') action?: string,
    @Query('userId') userId?: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.platformService.queryAuditLogs({
      module,
      action,
      userId,
      page: page ? +page : 1,
      pageSize: pageSize ? +pageSize : 20,
      startDate,
      endDate,
    });
  }

  // ── Platform Admin Users ───────────────────────────────────────────
  @Get('admins')
  @ApiOperation({ summary: '平台管理员列表' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  @ApiQuery({ name: 'search', required: false })
  listPlatformAdmins(
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('search') search?: string,
  ) {
    return this.platformService.listPlatformAdmins({
      page: page ? +page : 1,
      pageSize: pageSize ? +pageSize : 20,
      search,
    });
  }

  @Post('admins')
  @ApiOperation({ summary: '创建平台管理员' })
  createPlatformAdmin(@Body() dto: CreatePlatformAdminDto) {
    return this.platformService.createPlatformAdmin(dto);
  }

  @Patch('admins/:id')
  @ApiOperation({ summary: '更新平台管理员' })
  @HttpCode(HttpStatus.OK)
  updatePlatformAdmin(@Param('id') id: string, @Body() dto: UpdatePlatformAdminDto) {
    return this.platformService.updatePlatformAdmin(id, dto);
  }

  @Post('admins/:id/reset-password')
  @ApiOperation({ summary: '重置平台管理员密码' })
  @HttpCode(HttpStatus.OK)
  resetPassword(@Param('id') id: string, @Body() dto: ResetPasswordDto) {
    return this.platformService.resetPlatformAdminPassword(id, dto.newPassword);
  }

  @Delete('admins/:id')
  @ApiOperation({ summary: '删除平台管理员' })
  deletePlatformAdmin(@Param('id') id: string) {
    return this.platformService.deletePlatformAdmin(id);
  }

  // ── System Config ─────────────────────────────────────────────────
  @Get('configs')
  @ApiOperation({ summary: '系统配置列表' })
  @ApiQuery({ name: 'category', required: false })
  listSystemConfigs(@Query('category') category?: string) {
    return this.platformService.listSystemConfigs(category);
  }

  @Get('configs/:key')
  @ApiOperation({ summary: '获取系统配置' })
  getSystemConfig(@Param('key') key: string) {
    return this.platformService.getSystemConfig(key);
  }

  @Post('configs')
  @ApiOperation({ summary: '设置系统配置' })
  setSystemConfig(@Body() dto: SetSystemConfigDto) {
    return this.platformService.setSystemConfig(dto);
  }

  @Delete('configs/:key')
  @ApiOperation({ summary: '删除系统配置' })
  deleteSystemConfig(@Param('key') key: string) {
    return this.platformService.deleteSystemConfig(key);
  }

  // ── Tenant Migration ─────────────────────────────────────────────
  @Post('tenants/:id/migrate')
  @ApiOperation({ summary: '迁移租户到新存储空间' })
  @HttpCode(HttpStatus.OK)
  migrateTenant(
    @Param('id') id: string,
    @Body() dto: MigrateTenantDto,
    @Request() req: any,
  ) {
    return this.platformService.migrateTenant(id, dto.targetSpaceId, dto, req.user.id);
  }
}
