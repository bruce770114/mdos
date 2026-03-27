import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

export type CollectionLevel = 1 | 2 | 3;
export type CollectionMethod = 'system' | 'phone' | 'email' | 'visit';

@Entity('collection_records')
export class CollectionRecord extends BaseEntity {
  @Index()
  @Column({ type: 'varchar' })
  tenantId: string;

  @Column({ type: 'varchar' })
  receivableId: string;

  @Column({ type: 'varchar' })
  customerId: string;

  @Column({ type: 'int' })
  level: CollectionLevel;

  @Column({ type: 'varchar', enum: ['system', 'phone', 'email', 'visit'], default: 'system' })
  method: CollectionMethod;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'varchar', nullable: true })
  operatorId: string | null;
}
