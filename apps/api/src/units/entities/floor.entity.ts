import { Entity, Column, Index, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Building } from './building.entity';
import { Unit } from './unit.entity';

@Entity('floors')
export class Floor extends BaseEntity {
  @Index()
  @Column()
  tenantId: string;

  @Column()
  buildingId: string;

  @Column({ type: 'int' })
  floorNo: number;

  @Column()
  floorName: string;

  @Column({ nullable: true, type: 'decimal', precision: 12, scale: 2 })
  totalArea: number | null;

  @Column({ nullable: true, type: 'varchar' })
  floorPlanUrl: string | null;

  @ManyToOne(() => Building, (building) => building.floors, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'buildingId' })
  building: Building;

  @OneToMany(() => Unit, (unit) => unit.floor)
  units: Unit[];
}
