import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

export type PlanTier = 'trial' | 'standard' | 'professional' | 'enterprise';

@Entity('subscription_plans')
export class SubscriptionPlan extends BaseEntity {
  @Column({ name: 'plan_id', length: 100, unique: true })
  planId: string;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'enum', enum: ['trial', 'standard', 'professional', 'enterprise'] })
  tier: PlanTier;

  @Column({ name: 'price_monthly', type: 'decimal', precision: 10, scale: 2, default: 0 })
  priceMonthly: number;

  @Column({ name: 'price_yearly', type: 'decimal', precision: 10, scale: 2, default: 0 })
  priceYearly: number;

  @Column({ name: 'max_users', type: 'int', default: 10 })
  maxUsers: number;

  @Column({ name: 'max_projects', type: 'int', default: 5 })
  maxProjects: number;

  @Column({ name: 'storage_gb', type: 'int', default: 50 })
  storageGB: number;

  @Column({ type: 'jsonb', nullable: true })
  features: Record<string, boolean | number> | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'trial_days', type: 'int', default: 0 })
  trialDays: number;

  @Column({ type: 'text', nullable: true })
  description: string | null;
}
