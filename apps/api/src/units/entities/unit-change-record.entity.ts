import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

export type ChangeType = 'merge' | 'split' | 'status_change';

@Entity('unit_change_records')
export class UnitChangeRecord extends BaseEntity {
  @Index()
  @Column({ type: 'varchar' })
  tenantId: string;

  @Column({ type: 'varchar' })
  floorId: string;

  @Column({ type: 'varchar', enum: ['merge', 'split', 'status_change'] })
  changeType: ChangeType;

  @Column({ type: 'jsonb', nullable: true })
  beforeSnapshot: any | null;

  @Column({ type: 'jsonb', nullable: true })
  afterSnapshot: any | null;

  @Column({ type: 'varchar', nullable: true })
  operatorId: string | null;

  @Column({ type: 'varchar', nullable: true })
  contractId: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
