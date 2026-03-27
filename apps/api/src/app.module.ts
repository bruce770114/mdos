import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { CacheModule } from '@nestjs/cache-manager';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TenantsModule } from './tenants/tenants.module';
import { PermissionsModule } from './permissions/permissions.module';
import { UnitsModule } from './units/units.module';
import { CustomersModule } from './customers/customers.module';
import { ContractsModule } from './contracts/contracts.module';
import { BillingModule } from './billing/billing.module';
import { FinancialModule } from './financial/financial.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SettingsModule } from './settings/settings.module';
import { AssetMapModule } from './asset-map/asset-map.module';
import { PlatformAdminModule } from './platform-admin/platform-admin.module';
import { AuditLogModule } from './audit-log/audit-log.module';
import { TasksModule } from './tasks/tasks.module';
import { DataImportModule } from './data-import/data-import.module';
import { ContractAiModule } from './contract-ai/contract-ai.module';
import { ReconciliationModule } from './reconciliation/reconciliation.module';
import { LlmModelsModule } from './llm-models/llm-models.module';
import { EmailService } from './common/services/email.service';
import { PdfService } from './common/services/pdf.service';
import { SpaceRouterService } from './common/services/space-router.service';
import { TenantDataSourceService } from './common/services/tenant-datasource.service';
import { TenantMigrationService } from './common/services/tenant-migration.service';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { TenantInterceptor } from './common/interceptors/tenant.interceptor';
import { SpaceInterceptor } from './common/interceptors/space.interceptor';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TenantDsDemoController } from './common/tenant-ds-demo.controller';
import { Tenant } from './tenants/tenant.entity';
import { Space } from './platform-admin/entities/space.entity';
import { Unit } from './units/entities/unit.entity';
import { Project } from './units/entities/project.entity';

@Module({
  imports: [
    // 全局 Repository 注册（用于 SpaceRouterService 等全局服务）
    TypeOrmModule.forFeature([Tenant, Space, Unit, Project]),
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        isGlobal: true,
        store: 'redis',
        host: config.get('REDIS_HOST', 'localhost'),
        port: config.get<number>('REDIS_PORT', 6379),
        password: config.get('REDIS_PASSWORD'),
        ttl: 300, // 5 minutes default
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get('DB_USERNAME', 'mdos'),
        password: config.get('DB_PASSWORD', 'mdos_pass_2024'),
        database: config.get('DB_DATABASE', 'mdos_db'),
        autoLoadEntities: true,
        synchronize: config.get('NODE_ENV') !== 'production',
        logging: config.get('NODE_ENV') === 'development',
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    UsersModule,
    TenantsModule,
    PermissionsModule,
    UnitsModule,
    CustomersModule,
    ContractsModule,
    BillingModule,
    FinancialModule,
    NotificationsModule,
    SettingsModule,
    AssetMapModule,
    PlatformAdminModule,
    AuditLogModule,
    TasksModule,
    DataImportModule,
    ContractAiModule,
    ReconciliationModule,
    LlmModelsModule,
  ],
  controllers: [TenantDsDemoController],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    { provide: APP_INTERCEPTOR, useClass: TenantInterceptor },
    { provide: APP_INTERCEPTOR, useClass: SpaceInterceptor },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    EmailService,
    PdfService,
    SpaceRouterService,
    TenantDataSourceService,
    TenantMigrationService,
  ],
  exports: [EmailService, PdfService, SpaceRouterService, TenantDataSourceService, TenantMigrationService],
})
export class AppModule {}
