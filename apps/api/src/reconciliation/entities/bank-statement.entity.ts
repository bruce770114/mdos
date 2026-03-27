import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

export type MatchStatus = 'unmatched' | 'matched' | 'manual';

@Entity('bank_statements')
export class BankStatement extends BaseEntity {
  @Index()
  @Column({ type: 'varchar' })
  tenantId: string;

  @Column({ type: 'date' })
  transactionDate: Date;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', nullable: true })
  reference: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', nullable: true })
  matchedReceivableId: string | null;

  @Column({
    type: 'varchar',
    enum: ['unmatched', 'matched', 'manual'],
    default: 'unmatched',
  })
  matchStatus: MatchStatus;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  importedAt: Date;
}
