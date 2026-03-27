import {
  Entity,
  Column,
  Index,
} from 'typeorm';
import { BaseEntity } from '../common/entities/base.entity';

@Entity('permissions')
export class Permission extends BaseEntity {
  @Column({ length: 100 })
  @Index()
  module: string;

  @Column({ length: 100 })
  action: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  resource: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;
}
