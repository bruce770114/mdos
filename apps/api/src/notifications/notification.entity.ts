import {
  Entity,
  Column,
  Index,
} from 'typeorm';
import { BaseEntity } from '../common/entities/base.entity';

export type NotificationType =
  | 'contract_reminder'
  | 'bill_overdue'
  | 'bill_review'
  | 'contract_approval'
  | 'system';

@Entity('notifications')
export class Notification extends BaseEntity {
  @Index()
  @Column({ type: 'varchar' })
  tenantId: string;

  @Index()
  @Column({ type: 'varchar', nullable: true })
  userId: string | null;

  @Column({
    type: 'enum',
    enum: ['contract_reminder', 'bill_overdue', 'bill_review', 'contract_approval', 'system'],
    default: 'system',
  })
  type: NotificationType;

  @Column({ type: 'varchar' })
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'boolean', default: false })
  isRead: boolean;

  @Column({ type: 'boolean', default: false })
  isProcessed: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;
}
