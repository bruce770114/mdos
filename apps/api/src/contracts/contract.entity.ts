import {
  Entity,
  Column,
  Index,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '../common/entities/base.entity';
import { ContractRentRule } from './contract-rent-rule.entity';

export type BillingType = 'fixed' | 'stepped' | 'guarantee_plus_share' | 'pure_share';
export type ContractStatus =
  | 'draft'
  | 'pending_approval'
  | 'active'
  | 'expiring_soon'
  | 'expired'
  | 'terminated';

@Entity('contracts')
export class Contract extends BaseEntity {
  @Index()
  @Column({ type: 'varchar' })
  tenantId: string;

  @Column({ type: 'varchar', unique: true })
  contractNo: string;

  @Column({ type: 'varchar' })
  customerId: string;

  @Column({ type: 'varchar' })
  unitId: string;

  @Column({ type: 'date' })
  startDate: Date;

  @Column({ type: 'date' })
  endDate: Date;

  @Column({ type: 'int', default: 0 })
  rentFreeDays: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  baseRent: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  propertyFee: number;

  @Column({
    type: 'enum',
    enum: ['fixed', 'stepped', 'guarantee_plus_share', 'pure_share'],
    default: 'fixed',
  })
  billingType: BillingType;

  @Column({
    type: 'enum',
    enum: ['draft', 'pending_approval', 'active', 'expiring_soon', 'expired', 'terminated'],
    default: 'draft',
  })
  status: ContractStatus;

  @Column({ type: 'date', nullable: true })
  signedDate: Date | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  totalAmount: number | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @OneToMany(() => ContractRentRule, (rule) => rule.contract, { cascade: true })
  rules: ContractRentRule[];
}
