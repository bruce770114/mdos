import {
  Entity,
  Column,
  Index,
} from 'typeorm';
import { BaseEntity } from '../common/entities/base.entity';

export type ReceivableStatus = 'outstanding' | 'partial' | 'paid' | 'overdue';

@Entity('receivables')
export class Receivable extends BaseEntity {
  @Index()
  @Column({ type: 'varchar' })
  tenantId: string;

  @Column({ type: 'varchar' })
  billId: string;

  @Column({ type: 'varchar' })
  contractId: string;

  @Column({ type: 'varchar' })
  customerId: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  paidAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  balance: number;

  @Column({
    type: 'enum',
    enum: ['outstanding', 'partial', 'paid', 'overdue'],
    default: 'outstanding',
  })
  status: ReceivableStatus;

  @Column({ type: 'date' })
  dueDate: Date;

  @Column({ type: 'int', default: 0 })
  overdueDays: number;
}
