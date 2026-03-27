import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlatformAdminController } from './platform-admin.controller';
import { PlatformAdminService } from './platform-admin.service';
import { Space } from './entities/space.entity';
import { SubscriptionPlan } from './entities/subscription-plan.entity';
import { SubscriptionOrder } from './entities/subscription-order.entity';
import { TenantDomain } from './entities/tenant-domain.entity';
import { Tenant } from '../tenants/tenant.entity';
import { AuditLog } from '../audit-log/audit-log.entity';
import { User } from '../users/user.entity';
import { SystemConfig } from './entities/system-config.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Space,
      SubscriptionPlan,
      SubscriptionOrder,
      TenantDomain,
      Tenant,
      AuditLog,
      User,
      SystemConfig,
    ]),
  ],
  controllers: [PlatformAdminController],
  providers: [PlatformAdminService],
  exports: [PlatformAdminService],
})
export class PlatformAdminModule {}
