import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantsController } from './tenants.controller';
import { TenantSubscriptionController } from './tenant-subscription.controller';
import { TenantsService } from './tenants.service';
import { Tenant } from './tenant.entity';
import { User } from '../users/user.entity';
import { PermissionsModule } from '../permissions/permissions.module';
import { SubscriptionPlan } from '../platform-admin/entities/subscription-plan.entity';
import { SubscriptionOrder } from '../platform-admin/entities/subscription-order.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Tenant, User, SubscriptionPlan, SubscriptionOrder]),
    PermissionsModule,
  ],
  controllers: [TenantsController, TenantSubscriptionController],
  providers: [TenantsService],
  exports: [TenantsService],
})
export class TenantsModule {}
