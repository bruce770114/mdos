import { Entity, Column, Index, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Project } from './project.entity';
import { Floor } from './floor.entity';

@Entity('buildings')
export class Building extends BaseEntity {
  @Index()
  @Column()
  tenantId: string;

  @Column()
  projectId: string;

  @Column()
  name: string;

  @Column({ type: 'int', default: 1 })
  floorCount: number;

  @Column({ nullable: true, type: 'decimal', precision: 12, scale: 2 })
  totalArea: number | null;

  @Column({ nullable: true, type: 'text' })
  description: string | null;

  @ManyToOne(() => Project, (project) => project.buildings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @OneToMany(() => Floor, (floor) => floor.building)
  floors: Floor[];
}
