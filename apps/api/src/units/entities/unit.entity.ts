import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Floor } from './floor.entity';

export type UnitType = 'office' | 'retail' | 'warehouse' | 'other';
export type UnitStatus = 'vacant' | 'rented' | 'reserved' | 'renovating' | 'maintenance';

export interface UnitPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

@Entity('units')
export class Unit extends BaseEntity {
  @Index()
  @Column()
  tenantId: string;

  @Column()
  floorId: string;

  @Column()
  unitNo: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  area: number;

  @Column({ nullable: true, type: 'decimal', precision: 12, scale: 2 })
  areaUsable: number | null;

  @Column({ nullable: true, type: 'decimal', precision: 12, scale: 2 })
  areaCommon: number | null;

  @Column({ type: 'varchar', default: 'office' })
  unitType: UnitType;

  @Column({ type: 'varchar', default: 'vacant' })
  status: UnitStatus;

  @Column({ nullable: true, type: 'jsonb' })
  position: UnitPosition | null;

  @ManyToOne(() => Floor, (floor) => floor.units, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'floorId' })
  floor: Floor;
}
