import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Tenant } from './tenant.entity';
import { PermissionsService } from '../permissions/permissions.service';
import { User } from '../users/user.entity';

export class CreateTenantDto {
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
  logoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  domain?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  adminUsername?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  adminEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  adminPassword?: string;
}

export class UpdateTenantDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  domain?: string;

  @ApiPropertyOptional({ enum: ['active', 'inactive', 'suspended'] })
  @IsOptional()
  @IsEnum(['active', 'inactive', 'suspended'])
  status?: 'active' | 'inactive' | 'suspended';

  @ApiPropertyOptional()
  @IsOptional()
  config?: Record<string, any>;
}

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly permissionsService: PermissionsService,
  ) {}

  async create(dto: CreateTenantDto): Promise<{
    tenant: Tenant;
    adminUser?: Omit<User, 'passwordHash'>;
  }> {
    const existing = await this.tenantRepo.findOne({
      where: { code: dto.code },
    });
    if (existing) {
      throw new ConflictException(`租户代码 ${dto.code} 已存在`);
    }

    const tenant = this.tenantRepo.create({
      name: dto.name,
      code: dto.code,
      logoUrl: dto.logoUrl ?? null,
      domain: dto.domain ?? null,
      status: 'active',
      config: null,
    });
    const savedTenant = await this.tenantRepo.save(tenant);

    // Ensure global permissions exist
    await this.permissionsService.initDefaultPermissions();

    // Seed default roles for this tenant
    const roles = await this.permissionsService.seedDefaultRoles(savedTenant.id);

    let adminUser: User | undefined;
    if (dto.adminEmail && dto.adminPassword) {
      const superAdminRole = roles.find((r) => r.code === 'super_admin');
      const passwordHash = await bcrypt.hash(dto.adminPassword, 12);

      adminUser = this.userRepo.create({
        tenantId: savedTenant.id,
        username: dto.adminUsername ?? dto.adminEmail,
        email: dto.adminEmail,
        passwordHash,
        status: 'active',
        roles: superAdminRole ? [superAdminRole] : [],
      });
      await this.userRepo.save(adminUser);
    }

    const result: { tenant: Tenant; adminUser?: Omit<User, 'passwordHash'> } = {
      tenant: savedTenant,
    };

    if (adminUser) {
      const { passwordHash, ...safeUser } = adminUser;
      result.adminUser = safeUser as any;
    }

    return result;
  }

  async findAll(): Promise<Tenant[]> {
    return this.tenantRepo.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Tenant> {
    const tenant = await this.tenantRepo.findOne({ where: { id } });
    if (!tenant) {
      throw new NotFoundException(`租户 ${id} 不存在`);
    }
    return tenant;
  }

  async findByCode(code: string): Promise<Tenant | null> {
    return this.tenantRepo.findOne({ where: { code } });
  }

  async update(id: string, dto: UpdateTenantDto): Promise<Tenant> {
    const tenant = await this.findOne(id);

    if (dto.name !== undefined) tenant.name = dto.name;
    if (dto.logoUrl !== undefined) tenant.logoUrl = dto.logoUrl ?? null;
    if (dto.domain !== undefined) tenant.domain = dto.domain ?? null;
    if (dto.status !== undefined) tenant.status = dto.status;
    if (dto.config !== undefined) tenant.config = dto.config ?? null;

    return this.tenantRepo.save(tenant);
  }
}
