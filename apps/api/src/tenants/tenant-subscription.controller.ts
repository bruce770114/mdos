import {
  Controller,
  Get,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from './tenant.entity';
import { SubscriptionPlan } from '../platform-admin/entities/subscription-plan.entity';
import { SubscriptionOrder } from '../platform-admin/entities/subscription-order.entity';

@ApiTags('tenant-subscription')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('subscription')
export class TenantSubscriptionController {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(SubscriptionPlan)
    private readonly planRepo: Repository<SubscriptionPlan>,
    @InjectRepository(SubscriptionOrder)
    private readonly orderRepo: Repository<SubscriptionOrder>,
  ) {}

  @Get('info')
  @ApiOperation({ summary: '获取当前租户的订阅信息' })
  async getSubscriptionInfo(@Request() req: any) {
    const tenantId = req.user.tenantId;

    const tenant = await this.tenantRepo.findOne({
      where: { id: tenantId },
    });

    if (!tenant) {
      return { error: 'Tenant not found' };
    }

    // Get current plan
    let plan: SubscriptionPlan | null = null;
    if (tenant.currentPlanId) {
      plan = await this.planRepo.findOne({
        where: { planId: tenant.currentPlanId },
      }) || null;
    }

    // Get subscription orders
    const orders = await this.orderRepo.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
      take: 5,
    });

    // Calculate days remaining
    let daysRemaining: number | null = null;
    if (tenant.subscriptionExpiresAt) {
      const expiresAt = new Date(tenant.subscriptionExpiresAt);
      const now = new Date();
      daysRemaining = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    }

    return {
      tenant: {
        id: tenant.id,
        name: tenant.name,
        code: tenant.code,
        lifecycleStatus: tenant.lifecycleStatus,
      },
      subscription: {
        planId: tenant.currentPlanId,
        planName: plan?.name || null,
        planTier: plan?.tier || null,
        expiresAt: tenant.subscriptionExpiresAt,
        daysRemaining,
        isExpired: daysRemaining !== null && daysRemaining < 0,
        isExpiringSoon: daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= 30,
      },
      planDetails: plan ? {
        maxUsers: plan.maxUsers,
        maxProjects: plan.maxProjects,
        storageGB: plan.storageGB,
        priceMonthly: plan.priceMonthly,
        priceYearly: plan.priceYearly,
      } : null,
      orders: orders.map(o => ({
        id: o.id,
        orderType: o.orderType,
        planId: o.planId,
        amount: o.amount,
        paymentStatus: o.paymentStatus,
        validFrom: o.validFrom,
        validTo: o.validTo,
        createdAt: o.createdAt,
      })),
    };
  }
}
