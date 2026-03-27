import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity('floor_plan_versions')
export class FloorPlanVersion extends BaseEntity {
  @Index()
  @Column({ type: 'varchar' })
  tenantId: string;

  @Index()
  @Column({ type: 'varchar' })
  floorId: string;

  @Column({ type: 'varchar' })
  versionNo: string;

  @Column({ type: 'jsonb' })
  snapshot: any[];

  @Column({ type: 'varchar', nullable: true })
  operatorId: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
