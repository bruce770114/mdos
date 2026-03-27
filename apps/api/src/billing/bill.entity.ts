import {
  Entity,
  Column,
  Index,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '../common/entities/base.entity';
import { BillItem } from './bill-item.entity';

export type BillStatus = 'pending_review' | 'reviewed' | 'sent' | 'paid' | 'overdue';

@Entity('bills')
export class Bill extends BaseEntity {
  @Index()
  @Column({ type: 'varchar' })
  tenantId: string;

  @Column({ type: 'varchar' })
  contractId: string;

  @Column({ type: 'varchar' })
  customerId: string;

  @Column({ type: 'varchar' })
  unitId: string;

  @Column({ type: 'varchar', unique: true })
  billNo: string;

  @Column({ type: 'date' })
  periodStart: Date;

  @Column({ type: 'date' })
  periodEnd: Date;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  totalAmount: number;

  @Column({
    type: 'enum',
    enum: ['pending_review', 'reviewed', 'sent', 'paid', 'overdue'],
    default: 'pending_review',
  })
  status: BillStatus;

  @Column({ type: 'date' })
  dueDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  sentAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  paidAt: Date | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @OneToMany(() => BillItem, (item) => item.bill, { cascade: true })
  items: BillItem[];
}
