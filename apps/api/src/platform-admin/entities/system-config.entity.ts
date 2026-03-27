import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity('system_configs')
export class SystemConfig extends BaseEntity {
  @Column({ name: 'config_key', type: 'varchar', length: 100, unique: true })
  @Index()
  configKey: string;

  @Column({ type: 'varchar', length: 500 })
  configValue: string;

  @Column({ type: 'varchar', length: 50 })
  category: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'is_public', default: false })
  isPublic: boolean;
}
