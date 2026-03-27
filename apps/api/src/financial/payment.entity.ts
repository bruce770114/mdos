import {
  Entity,
  Column,
  Index,
} from 'typeorm';
import { BaseEntity } from '../common/entities/base.entity';

export type PaymentMethod = 'bank_transfer' | 'cash' | 'check' | 'other';

@Entity('payments')
export class Payment extends BaseEntity {
  @Index()
  @Column({ type: 'varchar' })
  tenantId: string;

  @Column({ type: 'varchar' })
  receivableId: string;

  @Column({ type: 'varchar' })
  customerId: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'date' })
  paymentDate: Date;

  @Column({
    type: 'enum',
    enum: ['bank_transfer', 'cash', 'check', 'other'],
    default: 'bank_transfer',
  })
  paymentMethod: PaymentMethod;

  @Column({ type: 'varchar', nullable: true })
  reference: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
