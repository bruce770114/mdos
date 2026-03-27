import { Entity, Column, Index, Unique } from 'typeorm';
import { BaseEntity } from '../common/entities/base.entity';

@Entity('system_settings')
@Unique(['tenantId', 'category', 'key'])
export class SystemSetting extends BaseEntity {
  @Index()
  @Column()
  tenantId: string;

  @Column()
  category: string;

  @Column()
  key: string;

  @Column({ type: 'jsonb' })
  value: unknown;

  @Column({ nullable: true, type: 'varchar' })
  description: string | null;
}
