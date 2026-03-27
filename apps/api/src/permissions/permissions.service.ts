import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsArray,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from './role.entity';
import { Permission } from './permission.entity';

export class CreateRoleDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateRoleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

export class SetRolePermissionsDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  permissionIds: string[];
}

// System default permissions definition
const DEFAULT_PERMISSIONS = [
  // Users module
  { module: 'users', action: 'read', resource: '*', description: '查看用户列表' },
  { module: 'users', action: 'create', resource: '*', description: '创建用户' },
  { module: 'users', action: 'update', resource: '*', description: '编辑用户' },
  { module: 'users', action: 'delete', resource: '*', description: '删除用户' },
  { module: 'users', action: 'manage_roles', resource: '*', description: '管理用户角色' },
  // Roles module
  { module: 'roles', action: 'read', resource: '*', description: '查看角色列表' },
  { module: 'roles', action: 'create', resource: '*', description: '创建角色' },
  { module: 'roles', action: 'update', resource: '*', description: '编辑角色' },
  { module: 'roles', action: 'delete', resource: '*', description: '删除角色' },
  // Units (properties)
  { module: 'units', action: 'read', resource: '*', description: '查看房源' },
  { module: 'units', action: 'create', resource: '*', description: '创建房源' },
  { module: 'units', action: 'update', resource: '*', description: '编辑房源' },
  { module: 'units', action: 'delete', resource: '*', description: '删除房源' },
  // Customers
  { module: 'customers', action: 'read', resource: '*', description: '查看客户' },
  { module: 'customers', action: 'create', resource: '*', description: '创建客户' },
  { module: 'customers', action: 'update', resource: '*', description: '编辑客户' },
  { module: 'customers', action: 'delete', resource: '*', description: '删除客户' },
  // Contracts
  { module: 'contracts', action: 'read', resource: '*', description: '查看合同' },
  { module: 'contracts', action: 'create', resource: '*', description: '创建合同' },
  { module: 'contracts', action: 'update', resource: '*', description: '编辑合同' },
  { module: 'contracts', action: 'delete', resource: '*', description: '删除合同' },
  { module: 'contracts', action: 'sign', resource: '*', description: '签署合同' },
  // Billing
  { module: 'billing', action: 'read', resource: '*', description: '查看账单' },
  { module: 'billing', action: 'create', resource: '*', description: '创建账单' },
  { module: 'billing', action: 'update', resource: '*', description: '编辑账单' },
  { module: 'billing', action: 'collect', resource: '*', description: '收款操作' },
  // Financial
  { module: 'financial', action: 'read', resource: '*', description: '查看财务报表' },
  { module: 'financial', action: 'export', resource: '*', description: '导出财务数据' },
  // Settings
  { module: 'settings', action: 'read', resource: '*', description: '查看系统设置' },
  { module: 'settings', action: 'update', resource: '*', description: '修改系统设置' },
  // Asset map
  { module: 'asset_map', action: 'read', resource: '*', description: '查看资产地图' },
  { module: 'asset_map', action: 'manage', resource: '*', description: '管理资产地图' },
];

// Default roles with their permission modules
const DEFAULT_ROLES = [
  {
    name: '超级管理员',
    code: 'super_admin',
    description: '拥有所有权限',
    permissionModules: null, // null = all
  },
  {
    name: '管理员',
    code: 'admin',
    description: '拥有大部分管理权限，不包括系统设置',
    permissionModules: ['users', 'roles', 'units', 'customers', 'contracts', 'billing', 'financial', 'asset_map'],
  },
  {
    name: '房产顾问',
    code: 'agent',
    description: '负责客户跟进和合同签署',
    permissionModules: ['customers', 'units', 'contracts'],
  },
  {
    name: '财务专员',
    code: 'finance',
    description: '负责账单收款和财务报表',
    permissionModules: ['billing', 'financial', 'contracts'],
  },
  {
    name: '只读访客',
    code: 'viewer',
    description: '只能查看数据，不能修改',
    permissionModules: null, // filtered to read-only below
    readOnly: true,
  },
];

@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionRepo: Repository<Permission>,
  ) {}

  // ─── Roles ───────────────────────────────────────────────────────────────

  async findAllRoles(tenantId: string): Promise<Role[]> {
    return this.roleRepo.find({
      where: [{ tenantId }, { isSystem: true }],
      relations: ['permissions'],
      order: { createdAt: 'ASC' },
    });
  }

  async createRole(dto: CreateRoleDto, tenantId: string): Promise<Role> {
    const existing = await this.roleRepo.findOne({
      where: { code: dto.code, tenantId },
    });
    if (existing) {
      throw new ConflictException(`角色代码 ${dto.code} 已存在`);
    }

    const role = this.roleRepo.create({
      tenantId,
      name: dto.name,
      code: dto.code,
      description: dto.description ?? null,
      isSystem: false,
    });
    return this.roleRepo.save(role);
  }

  async updateRole(
    id: string,
    dto: UpdateRoleDto,
    tenantId: string,
  ): Promise<Role> {
    const role = await this.roleRepo.findOne({
      where: { id, tenantId },
    });
    if (!role) {
      throw new NotFoundException(`角色 ${id} 不存在`);
    }
    if (role.isSystem) {
      throw new BadRequestException('系统内置角色不可修改');
    }

    if (dto.name !== undefined) role.name = dto.name;
    if (dto.description !== undefined) role.description = dto.description ?? null;
    return this.roleRepo.save(role);
  }

  async deleteRole(id: string, tenantId: string): Promise<void> {
    const role = await this.roleRepo.findOne({
      where: { id, tenantId },
    });
    if (!role) {
      throw new NotFoundException(`角色 ${id} 不存在`);
    }
    if (role.isSystem) {
      throw new BadRequestException('系统内置角色不可删除');
    }
    await this.roleRepo.softDelete(id);
  }

  // ─── Permissions ─────────────────────────────────────────────────────────

  async findAllPermissions(): Promise<Permission[]> {
    return this.permissionRepo.find({
      order: { module: 'ASC', action: 'ASC' },
    });
  }

  async getRolePermissions(roleId: string): Promise<Permission[]> {
    const role = await this.roleRepo.findOne({
      where: { id: roleId },
      relations: ['permissions'],
    });
    if (!role) {
      throw new NotFoundException(`角色 ${roleId} 不存在`);
    }
    return role.permissions ?? [];
  }

  async setRolePermissions(
    roleId: string,
    permissionIds: string[],
    tenantId: string,
  ): Promise<Role> {
    const role = await this.roleRepo.findOne({
      where: { id: roleId, tenantId },
      relations: ['permissions'],
    });
    if (!role) {
      throw new NotFoundException(`角色 ${roleId} 不存在`);
    }
    if (role.isSystem) {
      throw new BadRequestException('系统内置角色权限不可修改');
    }

    const permissions = permissionIds.length > 0
      ? await this.permissionRepo.findByIds(permissionIds)
      : [];

    role.permissions = permissions;
    return this.roleRepo.save(role);
  }

  // ─── Seeding ─────────────────────────────────────────────────────────────

  async initDefaultPermissions(): Promise<Permission[]> {
    const existing = await this.permissionRepo.count();
    if (existing > 0) {
      return this.findAllPermissions();
    }

    const permissions = this.permissionRepo.create(DEFAULT_PERMISSIONS);
    return this.permissionRepo.save(permissions);
  }

  async seedDefaultRoles(tenantId: string): Promise<Role[]> {
    const allPermissions = await this.findAllPermissions();
    const created: Role[] = [];

    for (const roleDef of DEFAULT_ROLES) {
      const existingRole = await this.roleRepo.findOne({
        where: { code: roleDef.code, tenantId },
      });
      if (existingRole) {
        created.push(existingRole);
        continue;
      }

      let rolePermissions: Permission[];

      if ((roleDef as any).readOnly) {
        // Viewer: only read/export actions
        rolePermissions = allPermissions.filter((p) =>
          ['read', 'export'].includes(p.action),
        );
      } else if (roleDef.permissionModules === null) {
        // Super admin: all permissions
        rolePermissions = allPermissions;
      } else {
        rolePermissions = allPermissions.filter((p) =>
          (roleDef.permissionModules as string[]).includes(p.module),
        );
      }

      const role = this.roleRepo.create({
        tenantId,
        name: roleDef.name,
        code: roleDef.code,
        description: roleDef.description,
        isSystem: false,
        permissions: rolePermissions,
      });

      created.push(await this.roleRepo.save(role));
    }

    return created;
  }
}
