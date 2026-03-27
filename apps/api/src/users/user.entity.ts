import {
  Entity,
  Column,
  Index,
  ManyToOne,
  ManyToMany,
  JoinTable,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../common/entities/base.entity';
import { Tenant } from '../tenants/tenant.entity';
import { Role } from '../permissions/role.entity';

@Entity('users')
export class User extends BaseEntity {
  @Column({ name: 'tenant_id' })
  @Index()
  tenantId: string;

  @Column({ length: 100 })
  username: string;

  @Column({ length: 255 })
  email: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  @Column({ name: 'password_hash', type: 'text' })
  passwordHash: string;

  @Column({
    type: 'enum',
    enum: ['active', 'inactive'],
    default: 'active',
  })
  status: 'active' | 'inactive';

  @Column({ name: 'last_login_at', type: 'timestamptz', nullable: true })
  lastLoginAt: Date | null;

  /** Platform-level super admin — can access /platform/* endpoints */
  @Column({ name: 'is_platform_admin', default: false })
  isPlatformAdmin: boolean;

  /** User interface language preference: 'zh' | 'en' | etc. */
  @Column({ name: 'language', length: 10, default: 'zh' })
  language: string;

  @ManyToOne(() => Tenant, (tenant) => tenant.users, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @ManyToMany(() => Role, { eager: false })
  @JoinTable({
    name: 'user_roles',
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'role_id', referencedColumnName: 'id' },
  })
  roles: Role[];
}
