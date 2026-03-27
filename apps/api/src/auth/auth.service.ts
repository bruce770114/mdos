import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../users/user.entity';
import { Tenant } from '../tenants/tenant.entity';
import { AuditLogService } from '../audit-log/audit-log.service';

export interface JwtPayload {
  sub: string;
  tenantId: string;
  username: string;
  roles: string[];
  isPlatformAdmin?: boolean;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResult extends TokenPair {
  user: {
    id: string;
    username: string;
    email: string;
    tenantId: string;
    roles: string[];
    isPlatformAdmin: boolean;
    language: string;
  };
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async login(
    dto: { username: string; password: string; tenantCode: string },
    meta?: { ipAddress?: string; userAgent?: string },
  ): Promise<LoginResult> {
    const tenant = await this.tenantRepo.findOne({
      where: { code: dto.tenantCode },
    });
    if (!tenant) {
      this.auditLogService.log({
        action: 'LOGIN',
        module: 'auth',
        username: dto.username,
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
        success: false,
        errorMessage: '租户不存在或已被禁用',
      });
      throw new UnauthorizedException('租户不存在或已被禁用');
    }
    if (tenant.status !== 'active') {
      this.auditLogService.log({
        tenantId: tenant.id,
        action: 'LOGIN',
        module: 'auth',
        username: dto.username,
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
        success: false,
        errorMessage: '租户账号已被停用',
      });
      throw new UnauthorizedException('租户账号已被停用');
    }

    const user = await this.userRepo.findOne({
      where: [
        { username: dto.username, tenantId: tenant.id },
        { email: dto.username, tenantId: tenant.id },
      ],
      relations: ['roles'],
    });
    if (!user) {
      this.auditLogService.log({
        tenantId: tenant.id,
        action: 'LOGIN',
        module: 'auth',
        username: dto.username,
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
        success: false,
        errorMessage: '用户名或密码错误',
      });
      throw new UnauthorizedException('用户名或密码错误');
    }
    if (user.status !== 'active') {
      this.auditLogService.log({
        tenantId: tenant.id,
        userId: user.id,
        username: user.username,
        action: 'LOGIN',
        module: 'auth',
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
        success: false,
        errorMessage: '用户账号已被禁用',
      });
      throw new UnauthorizedException('用户账号已被禁用');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      this.auditLogService.log({
        tenantId: tenant.id,
        userId: user.id,
        username: user.username,
        action: 'LOGIN',
        module: 'auth',
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
        success: false,
        errorMessage: '用户名或密码错误',
      });
      throw new UnauthorizedException('用户名或密码错误');
    }

    await this.userRepo.update(user.id, { lastLoginAt: new Date() });

    const roleCodes = (user.roles ?? []).map((r) => r.code);
    const tokens = await this.generateTokens({
      sub: user.id,
      tenantId: tenant.id,
      username: user.username,
      roles: roleCodes,
      isPlatformAdmin: user.isPlatformAdmin,
    });

    this.auditLogService.log({
      tenantId: tenant.id,
      userId: user.id,
      username: user.username,
      action: 'LOGIN',
      module: 'auth',
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      success: true,
    });

    return {
      ...tokens,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        tenantId: tenant.id,
        roles: roleCodes,
        isPlatformAdmin: user.isPlatformAdmin,
        language: user.language ?? 'zh',
      },
    };
  }

  async adminLogin(
    dto: { username: string; password: string },
    meta?: { ipAddress?: string; userAgent?: string },
  ): Promise<LoginResult> {
    const user = await this.userRepo.findOne({
      where: { username: dto.username },
    });

    if (!user) {
      this.auditLogService.log({
        action: 'ADMIN_LOGIN',
        module: 'auth',
        username: dto.username,
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
        success: false,
        errorMessage: '用户名或密码错误',
      });
      throw new UnauthorizedException('用户名或密码错误');
    }

    if (!user.isPlatformAdmin) {
      this.auditLogService.log({
        action: 'ADMIN_LOGIN',
        module: 'auth',
        username: dto.username,
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
        success: false,
        errorMessage: '非平台管理员账户',
      });
      throw new UnauthorizedException('非平台管理员账户');
    }

    const passwordValid = await bcrypt.compare(dto.password, (user as any).passwordHash);
    if (!passwordValid) {
      this.auditLogService.log({
        action: 'ADMIN_LOGIN',
        module: 'auth',
        username: dto.username,
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
        success: false,
        errorMessage: '用户名或密码错误',
      });
      throw new UnauthorizedException('用户名或密码错误');
    }

    if (user.status !== 'active') {
      this.auditLogService.log({
        action: 'ADMIN_LOGIN',
        module: 'auth',
        username: dto.username,
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
        success: false,
        errorMessage: '账号已被禁用',
      });
      throw new UnauthorizedException('账号已被禁用');
    }

    // Update last login
    user.lastLoginAt = new Date();
    await this.userRepo.save(user);

    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      tenantId: user.tenantId,
      roles: [],
      isPlatformAdmin: user.isPlatformAdmin,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET', 'jwt_secret_change_me'),
      expiresIn: '2h',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET', 'refresh_secret_change_me'),
      expiresIn: '7d',
    });

    this.auditLogService.log({
      action: 'ADMIN_LOGIN',
      module: 'auth',
      userId: user.id,
      username: user.username,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      success: true,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        roles: [],
        tenantId: user.tenantId,
        isPlatformAdmin: user.isPlatformAdmin,
        language: user.language ?? 'zh',
      },
    };
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET', 'refresh_secret_change_me'),
      });
    } catch {
      throw new UnauthorizedException('刷新令牌无效或已过期');
    }

    const user = await this.userRepo.findOne({
      where: { id: payload.sub, tenantId: payload.tenantId },
      relations: ['roles'],
    });
    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('用户不存在或已被禁用');
    }

    const roleCodes = (user.roles ?? []).map((r) => r.code);
    return this.generateTokens({
      sub: user.id,
      tenantId: user.tenantId,
      username: user.username,
      roles: roleCodes,
      isPlatformAdmin: user.isPlatformAdmin,
    });
  }

  private async generateTokens(payload: JwtPayload): Promise<TokenPair> {
    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET', 'jwt_secret_change_me'),
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN', '2h'),
    });

    const refreshToken = this.jwtService.sign(
      { sub: payload.sub, tenantId: payload.tenantId },
      {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET', 'refresh_secret_change_me'),
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
      },
    );

    return { accessToken, refreshToken };
  }

  async validatePayload(payload: JwtPayload) {
    const user = await this.userRepo.findOne({
      where: { id: payload.sub, tenantId: payload.tenantId },
    });
    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('用户不存在或已被禁用');
    }
    return {
      userId: payload.sub,
      id: payload.sub,
      tenantId: payload.tenantId,
      username: payload.username,
      roles: payload.roles,
      isPlatformAdmin: user.isPlatformAdmin,
    };
  }
}
