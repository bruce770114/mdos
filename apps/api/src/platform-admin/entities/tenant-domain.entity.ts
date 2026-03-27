import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

export type DomainType = 'subdomain' | 'custom';
export type DomainStatus = 'pending' | 'verifying' | 'active' | 'failed' | 'disabled';
export type SslStatus = 'pending' | 'active' | 'expired';

@Entity('tenant_domains')
export class TenantDomain extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'varchar' })
  @Index()
  tenantId: string;

  @Column({ length: 255, unique: true })
  domain: string;

  @Column({ type: 'enum', enum: ['subdomain', 'custom'], default: 'subdomain' })
  type: DomainType;

  @Column({
    type: 'enum',
    enum: ['pending', 'verifying', 'active', 'failed', 'disabled'],
    default: 'pending',
  })
  status: DomainStatus;

  @Column({ name: 'cname_target', type: 'text', nullable: true })
  cnameTarget: string | null;

  @Column({
    name: 'ssl_status',
    type: 'enum',
    enum: ['pending', 'active', 'expired'],
    default: 'pending',
  })
  sslStatus: SslStatus;

  @Column({ name: 'verified_at', type: 'timestamptz', nullable: true })
  verifiedAt: Date | null;

  @Column({ name: 'last_checked_at', type: 'timestamptz', nullable: true })
  lastCheckedAt: Date | null;
}
