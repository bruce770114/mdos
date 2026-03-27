import {
  Entity,
  Column,
  Index,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { BaseEntity } from '../common/entities/base.entity';
import { Permission } from './permission.entity';

@Entity('roles')
export class Role extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'varchar', nullable: true })
  @Index()
  tenantId: string | null;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 100 })
  code: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'is_system', default: false })
  isSystem: boolean;

  @ManyToMany(() => Permission, { eager: false })
  @JoinTable({
    name: 'role_permissions',
    joinColumn: { name: 'role_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'permission_id', referencedColumnName: 'id' },
  })
  permissions: Permission[];
}
