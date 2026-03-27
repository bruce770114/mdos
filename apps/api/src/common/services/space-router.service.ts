import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { Tenant } from '../../tenants/tenant.entity';
import { Space } from '../../platform-admin/entities/space.entity';

export interface TenantSpaceInfo {
  tenantId: string;
  spaceId: string;
  spaceName: string;
  schemaName: string;
  dbInstance: string;
  region: string;
  type: 'shared' | 'dedicated';
}

@Injectable()
export class SpaceRouterService {
  private readonly logger = new Logger(SpaceRouterService.name);
  private static readonly CACHE_KEY_PREFIX = 'space:router:';
  private static readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(Space)
    private readonly spaceRepo: Repository<Space>,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * 根据 tenantId 解析租户存储空间信息
   * 1. 先从 Redis 缓存获取
   * 2. 缓存未命中则查询数据库
   * 3. 将结果写入缓存
   */
  async resolve(tenantId: string): Promise<TenantSpaceInfo> {
    const cacheKey = `${SpaceRouterService.CACHE_KEY_PREFIX}${tenantId}`;

    // 1. 尝试从缓存获取
    const cached = await this.cacheManager.get<TenantSpaceInfo>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for tenant: ${tenantId}`);
      return cached;
    }

    // 2. 缓存未命中，查询数据库
    this.logger.debug(`Cache miss for tenant: ${tenantId}, querying database...`);

    const tenant = await this.tenantRepo.findOne({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant not found: ${tenantId}`);
    }

    if (!tenant.spaceId) {
      throw new NotFoundException(`Tenant ${tenantId} has no space assigned`);
    }

    const space = await this.spaceRepo.findOne({
      where: { spaceId: tenant.spaceId },
    });

    if (!space) {
      throw new NotFoundException(`Space not found: ${tenant.spaceId}`);
    }

    // 3. 构建结果
    const spaceInfo: TenantSpaceInfo = {
      tenantId: tenant.id,
      spaceId: space.spaceId,
      spaceName: space.name,
      schemaName: space.schemaName,
      dbInstance: space.dbInstance,
      region: space.region,
      type: space.type,
    };

    // 4. 写入缓存
    await this.cacheManager.set(cacheKey, spaceInfo, SpaceRouterService.CACHE_TTL_MS);

    return spaceInfo;
  }

  /**
   * 清除指定租户的缓存
   * 用于 Space 变更时主动失效缓存
   */
  async invalidateCache(tenantId: string): Promise<void> {
    const cacheKey = `${SpaceRouterService.CACHE_KEY_PREFIX}${tenantId}`;
    await this.cacheManager.del(cacheKey);
    this.logger.log(`Cache invalidated for tenant: ${tenantId}`);
  }

  /**
   * 清除所有租户缓存
   * 用于 Space 整体变更时
   */
  async invalidateAllCache(): Promise<void> {
    // Redis 的模式匹配删除需要底层客户端支持
    // 简化实现：记录当前缓存版本或使用 Redis KEYS 扫描
    // 这里只是记录日志，生产环境需要更完善的实现
    this.logger.warn('Cache invalidation for all tenants not implemented');
  }

  /**
   * 获取数据源配置
   * 用于动态切换到租户所属的 Schema
   */
  async getDataSourceForTenant(tenantId: string): Promise<DataSource> {
    const spaceInfo = await this.resolve(tenantId);

    // 复用现有数据源，仅修改 search_path
    // 注意：TypeORM 默认不支持动态 search_path
    // 实际实现需要在 query runner 中设置
    return this.dataSource;
  }

  /**
   * 生成带有 tenant 过滤条件的 SQL 片段
   * 共享租户存储空间需要强制 tenant_id 过滤
   */
  getTenantFilterCondition(tenantId: string): string {
    return `tenant_id = '${tenantId}'`;
  }
}
