import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { IsString, IsEmail, IsOptional, IsNotEmpty, MinLength, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { User } from './user.entity';
import { Role } from '../permissions/role.entity';
import {
  PaginationDto,
  PaginatedResult,
  paginate,
} from '../common/dto/pagination.dto';

export class CreateUserDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty()
  @IsString()
  @MinLength(6)
  password: string;
}

export class UpdateUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  username?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @ApiPropertyOptional({ enum: ['active', 'inactive'] })
  @IsOptional()
  @IsString()
  status?: 'active' | 'inactive';
}

export class UpdateRolesDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  roleIds: string[];
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
  ) {}

  async findAll(
    tenantId: string,
    pagination: PaginationDto,
    search?: string,
  ): Promise<PaginatedResult<Omit<User, 'passwordHash'>>> {
    const { page = 1, pageSize = 20 } = pagination;
    const skip = (page - 1) * pageSize;

    const qb = this.userRepo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.roles', 'role')
      .where('user.tenantId = :tenantId', { tenantId })
      .andWhere('user.deletedAt IS NULL')
      .skip(skip)
      .take(pageSize)
      .orderBy('user.createdAt', 'DESC');

    if (search) {
      qb.andWhere(
        '(user.username ILIKE :search OR user.email ILIKE :search OR user.phone ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    const [list, total] = await qb.getManyAndCount();
    const safeList = list.map(({ passwordHash, ...rest }) => rest as any);
    return paginate(safeList, total, page, pageSize);
  }

  async findOne(id: string, tenantId: string): Promise<Omit<User, 'passwordHash'>> {
    const user = await this.userRepo.findOne({
      where: { id, tenantId },
      relations: ['roles', 'roles.permissions'],
    });
    if (!user) {
      throw new NotFoundException(`用户 ${id} 不存在`);
    }
    const { passwordHash, ...rest } = user;
    return rest as any;
  }

  async create(
    dto: CreateUserDto,
    tenantId: string,
  ): Promise<Omit<User, 'passwordHash'>> {
    const existing = await this.userRepo.findOne({
      where: [
        { username: dto.username, tenantId },
        { email: dto.email, tenantId },
      ],
    });
    if (existing) {
      throw new ConflictException('用户名或邮箱已存在');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = this.userRepo.create({
      tenantId,
      username: dto.username,
      email: dto.email,
      phone: dto.phone ?? null,
      passwordHash,
      status: 'active',
    });
    const saved = await this.userRepo.save(user);
    const { passwordHash: _ph, ...rest } = saved;
    return rest as any;
  }

  async update(
    id: string,
    dto: UpdateUserDto,
    tenantId: string,
  ): Promise<Omit<User, 'passwordHash'>> {
    const user = await this.userRepo.findOne({ where: { id, tenantId } });
    if (!user) {
      throw new NotFoundException(`用户 ${id} 不存在`);
    }

    if (dto.username && dto.username !== user.username) {
      const conflict = await this.userRepo.findOne({
        where: { username: dto.username, tenantId },
      });
      if (conflict && conflict.id !== id) {
        throw new ConflictException('用户名已被占用');
      }
    }

    if (dto.email && dto.email !== user.email) {
      const conflict = await this.userRepo.findOne({
        where: { email: dto.email, tenantId },
      });
      if (conflict && conflict.id !== id) {
        throw new ConflictException('邮箱已被占用');
      }
    }

    const updateData: Partial<User> = {};
    if (dto.username !== undefined) updateData.username = dto.username;
    if (dto.email !== undefined) updateData.email = dto.email;
    if (dto.phone !== undefined) updateData.phone = dto.phone ?? null;
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.password) {
      updateData.passwordHash = await bcrypt.hash(dto.password, 12);
    }

    await this.userRepo.update(id, updateData);
    return this.findOne(id, tenantId);
  }

  async remove(id: string, tenantId: string): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id, tenantId } });
    if (!user) {
      throw new NotFoundException(`用户 ${id} 不存在`);
    }
    await this.userRepo.softDelete(id);
  }

  async updateRoles(
    userId: string,
    roleIds: string[],
    tenantId: string,
  ): Promise<Omit<User, 'passwordHash'>> {
    const user = await this.userRepo.findOne({
      where: { id: userId, tenantId },
      relations: ['roles'],
    });
    if (!user) {
      throw new NotFoundException(`用户 ${userId} 不存在`);
    }

    const roles = await this.roleRepo.findByIds(roleIds);
    const validRoles = roles.filter(
      (r) => r.tenantId === tenantId || r.isSystem,
    );

    user.roles = validRoles;
    await this.userRepo.save(user);
    return this.findOne(userId, tenantId);
  }

  async updateLanguage(userId: string, tenantId: string, language: string): Promise<{ language: string }> {
    const user = await this.userRepo.findOne({ where: { id: userId, tenantId } });
    if (!user) {
      throw new NotFoundException(`用户 ${userId} 不存在`);
    }
    await this.userRepo.update(userId, { language: language });
    return { language: language };
  }
}
