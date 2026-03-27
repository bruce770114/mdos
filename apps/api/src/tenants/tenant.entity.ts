import {
  Entity,
  Column,
  OneToMany,
  Index,
} from 'typeorm';
import { BaseEntity } from '../common/entities/base.entity';

export type TenantLifecycleStatus =
  | 'trial'
  | 'active'
  | 'grace'
  | 'suspended'
  | 'stopped'
  | 'cancelled';

@Entity('tenants')
export class Tenant extends BaseEntity {
  @Column({ length: 100 })
  name: string;

  @Column({ length: 50, unique: true })
  code: string;

  /** URL-friendly slug, e.g. "xinghe" → xinghe.mdos.com */
  @Column({ type: 'varchar', length: 50, unique: true, nullable: true })
  @Index()
  slug: string | null;

  @Column({ name: 'logo_url', type: 'text', nullable: true })
  logoUrl: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  domain: string | null;

  /** System subdomain: {slug}.mdos.com */
  @Column({ name: 'sub_domain', type: 'varchar', length: 255, nullable: true })
  subDomain: string | null;

  /** Legacy simple status kept for backward compat */
  @Column({
    type: 'enum',
    enum: ['active', 'inactive', 'suspended'],
    default: 'active',
  })
  status: 'active' | 'inactive' | 'suspended';

  /** SaaS platform lifecycle status */
  @Column({
    name: 'lifecycle_status',
    type: 'enum',
    enum: ['trial', 'active', 'grace', 'suspended', 'stopped', 'cancelled'],
    default: 'trial',
  })
  lifecycleStatus: TenantLifecycleStatus;

  /** Which Space (PostgreSQL Schema) this tenant's data lives in */
  @Column({ name: 'space_id', type: 'varchar', nullable: true })
  spaceId: string | null;

  /** Current subscription plan ID */
  @Column({ name: 'current_plan_id', type: 'varchar', nullable: true })
  currentPlanId: string | null;

  /** When the trial period expires */
  @Column({ name: 'trial_expires_at', type: 'timestamptz', nullable: true })
  trialExpiresAt: Date | null;

  /** When the current subscription expires */
  @Column({ name: 'subscription_expires_at', type: 'timestamptz', nullable: true })
  subscriptionExpiresAt: Date | null;

  @Column({ type: 'jsonb', nullable: true })
  config: Record<string, any> | null;

  @OneToMany('User', 'tenant')
  users: any[];
}
