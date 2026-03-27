import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

export type SpaceType = 'shared' | 'dedicated';
export type SpaceStatus = 'active' | 'full' | 'locked' | 'deprecated';

@Entity('spaces')
export class Space extends BaseEntity {
  @Column({ name: 'space_id', length: 100, unique: true })
  spaceId: string;

  @Column({ length: 200 })
  name: string;

  @Column({ type: 'enum', enum: ['shared', 'dedicated'], default: 'shared' })
  type: SpaceType;

  @Column({ name: 'db_instance', length: 255 })
  dbInstance: string;

  @Column({ name: 'schema_name', length: 100 })
  schemaName: string;

  @Column({ length: 100, default: '华东（上海）' })
  region: string;

  @Column({ name: 'max_tenants', type: 'int', default: 50 })
  maxTenants: number;

  @Column({ name: 'current_tenants', type: 'int', default: 0 })
  @Index()
  currentTenants: number;

  @Column({ name: 'storage_used_gb', type: 'decimal', precision: 10, scale: 2, default: 0 })
  storageUsedGB: number;

  @Column({ name: 'storage_limit_gb', type: 'int', default: 500 })
  storageLimitGB: number;

  @Column({
    type: 'enum',
    enum: ['active', 'full', 'locked', 'deprecated'],
    default: 'active',
  })
  status: SpaceStatus;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
