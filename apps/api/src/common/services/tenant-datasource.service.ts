import {
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { DataSource, EntityTarget, Repository, SelectQueryBuilder } from 'typeorm';
import { SpaceRouterService, TenantSpaceInfo } from './space-router.service';

/**
 * 租户数据源服务
 *
 * 提供动态 Schema 切换能力，让业务代码无需关心数据存储在哪个 Schema
 *
 * 使用方式:
 * ```typescript
 * // 注入 TenantDataSourceService，在服务中使用
 * constructor(private readonly tenantDataSource: TenantDataSourceService) {}
 *
 * async findAll(request: any) {
 *   const repo = await this.tenantDataSource.getRepository(Unit, request);
 *   return repo.find();
 * }
 * ```
 */
@Injectable()
export class TenantDataSourceService implements OnModuleInit {
  private readonly logger = new Logger(TenantDataSourceService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly spaceRouter: SpaceRouterService,
  ) {}

  onModuleInit() {
    this.logger.log('TenantDataSourceService initialized');
  }

  /**
   * 根据请求获取指定实体的 Repository，并自动切换到正确的 Schema
   */
  async getRepository(
    entity: EntityTarget<any>,
    request: { tenantId?: string; tenantSpace?: TenantSpaceInfo },
  ): Promise<Repository<any>> {
    let tenantSpace: TenantSpaceInfo;

    if (request.tenantSpace) {
      tenantSpace = request.tenantSpace;
    } else if (request.tenantId) {
      tenantSpace = await this.spaceRouter.resolve(request.tenantId);
    } else {
      this.logger.warn('No tenant info, using default data source');
      return this.dataSource.getRepository(entity);
    }

    const baseRepo = this.dataSource.getRepository(entity);

    if (tenantSpace.type === 'shared') {
      return this.wrapWithTenantFilter(baseRepo, tenantSpace.tenantId);
    } else {
      this.logger.debug(`Dedicated space ${tenantSpace.spaceId}, using default schema`);
      return baseRepo;
    }
  }

  /**
   * 创建带有 tenant_id 过滤的 QueryBuilder
   */
  async createQueryBuilder(
    entity: EntityTarget<any>,
    request: { tenantId?: string; tenantSpace?: TenantSpaceInfo },
    alias: string,
  ): Promise<SelectQueryBuilder<any>> {
    const tenantSpace = await this.resolveTenantSpace(request);
    const baseQuery = this.dataSource.getRepository(entity).createQueryBuilder(alias);

    if (tenantSpace?.type === 'shared') {
      return baseQuery.andWhere(`${alias}.tenantId = :tenantId`, {
        tenantId: tenantSpace.tenantId,
      });
    }

    return baseQuery;
  }

  /**
   * 执行需要切换 Schema 的原始 SQL
   */
  async executeWithSchema(
    request: { tenantId?: string; tenantSpace?: TenantSpaceInfo },
    sql: string,
    params?: any[],
  ): Promise<any[]> {
    const tenantSpace = await this.resolveTenantSpace(request);

    if (!tenantSpace) {
      return this.dataSource.query(sql, params);
    }

    const setSearchPath = `SET search_path TO ${tenantSpace.schemaName},public`;
    const resetSearchPath = `SET search_path TO public`;

    try {
      await this.dataSource.query(setSearchPath);
      const result = await this.dataSource.query(sql, params);
      await this.dataSource.query(resetSearchPath);
      return result;
    } catch (error) {
      await this.dataSource.query(resetSearchPath).catch(() => {});
      throw error;
    }
  }

  /**
   * 使用事务执行，并自动设置正确的 schema
   */
  async transaction<T = any>(
    request: { tenantId?: string; tenantSpace?: TenantSpaceInfo },
    callback: (queryRunner: any) => Promise<T>,
  ): Promise<T> {
    const tenantSpace = await this.resolveTenantSpace(request);
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if (tenantSpace && tenantSpace.schemaName !== 'public') {
        await queryRunner.query(`SET search_path TO ${tenantSpace.schemaName},public`);
      }

      const result = await callback(queryRunner);
      await queryRunner.commitTransaction();
      return result;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.query('SET search_path TO public').catch(() => {});
      await queryRunner.release();
    }
  }

  // ==================== 私有方法 ====================

  private async resolveTenantSpace(
    request: { tenantId?: string; tenantSpace?: TenantSpaceInfo },
  ): Promise<TenantSpaceInfo | null> {
    if (request.tenantSpace) {
      return request.tenantSpace;
    }
    if (request.tenantId) {
      try {
        return await this.spaceRouter.resolve(request.tenantId);
      } catch {
        return null;
      }
    }
    return null;
  }

  /**
   * 包装 Repository，自动添加 tenant_id 过滤
   */
  private wrapWithTenantFilter(
    repo: Repository<any>,
    tenantId: string,
  ): Repository<any> {
    const originalFind = repo.find.bind(repo);
    const originalFindOne = repo.findOne.bind(repo);
    const originalCreateQueryBuilder = repo.createQueryBuilder.bind(repo);

    repo.find = (options?: any) => {
      return originalFind({
        ...options,
        where: { ...options?.where, tenantId },
      });
    };

    repo.findOne = (options?: any) => {
      return originalFindOne({
        ...options,
        where: { ...options?.where, tenantId },
      });
    };

    repo.createQueryBuilder = (alias: string) => {
      return originalCreateQueryBuilder(alias).andWhere(
        `${alias}.tenantId = :tenantId`,
        { tenantId },
      );
    };

    return repo;
  }
}
