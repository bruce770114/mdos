import { Entity, Column, Index, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Building } from './building.entity';

export type ProjectStatus = 'active' | 'inactive';

@Entity('projects')
export class Project extends BaseEntity {
  @Index()
  @Column()
  tenantId: string;

  @Column()
  name: string;

  @Column({ nullable: true, type: 'varchar' })
  address: string | null;

  @Column({ nullable: true, type: 'varchar' })
  city: string | null;

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 6 })
  lat: number | null;

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 6 })
  lng: number | null;

  @Column({ nullable: true, type: 'decimal', precision: 12, scale: 2 })
  totalArea: number | null;

  @Column({ type: 'varchar', default: 'active' })
  status: ProjectStatus;

  @Column({ nullable: true, type: 'text' })
  description: string | null;

  @OneToMany(() => Building, (building) => building.project)
  buildings: Building[];
}
