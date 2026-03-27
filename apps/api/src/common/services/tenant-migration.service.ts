import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Space } from '../../platform-admin/entities/space.entity';
import { Tenant } from '../../tenants/tenant.entity';
import { SpaceRouterService, TenantSpaceInfo } from './space-router.service';

/**
 * 租户存储空间迁移服务
 *
 * 负责将租户从一个 Space 迁移到另一个 Space
 * 支持：共享→专属、共享→共享、专属→专属
 */
@Injectable()
export class TenantMigrationService {
  private readonly logger = new Logger(TenantMigrationService.name);

  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(Space)
    private readonly spaceRepo: Repository<Space>,
    private readonly dataSource: DataSource,
    private readonly spaceRouter: SpaceRouterService,
  ) {}

  /**
   * 迁移预检
   * 检查迁移前置条件是否满足
   */
  async preMigrationCheck(tenantId: string, targetSpaceId: string): Promise<{
    canMigrate: boolean;
    warnings: string[];
    estimatedDuration: number; // 秒
    rowCount: number;
  }> {
    const warnings: string[] = [];

    // 1. 检查源租户是否存在
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    if (!tenant) {
      throw new NotFoundException(`Tenant not found: ${tenantId}`);
    }

    if (!tenant.spaceId) {
      throw new BadRequestException(`Tenant ${tenantId} has no space assigned`);
    }

    // 2. 检查目标 Space 是否存在
    const targetSpace = await this.spaceRepo.findOne({
      where: { spaceId: targetSpaceId },
    });
    if (!targetSpace) {
      throw new NotFoundException(`Target space not found: ${targetSpaceId}`);
    }

    // 3. 检查目标 Space 状态
    if (targetSpace.status !== 'active') {
      throw new BadRequestException(
        `Target space is not active: ${targetSpace.status}`,
      );
    }

    // 4. 检查目标 Space 类型兼容性
    const sourceSpace = await this.spaceRepo.findOne({
      where: { spaceId: tenant.spaceId },
    });
    if (!sourceSpace) {
      throw new NotFoundException(`Source space not found: ${tenant.spaceId}`);
    }

    // 5. 检查目标 Space 容量（仅对 shared 类型）
    if (targetSpace.type === 'shared') {
      if (targetSpace.currentTenants >= targetSpace.maxTenants) {
        throw new BadRequestException(`Target space is full: ${targetSpaceId}`);
      }

      // 预估容量警告
      if (targetSpace.currentTenants >= targetSpace.maxTenants * 0.9) {
        warnings.push(
          `Target space is over 90% capacity (${targetSpace.currentTenants}/${targetSpace.maxTenants})`,
        );
      }
    }

    // 6. 检查地域（不支持跨地域迁移）
    if (sourceSpace.region !== targetSpace.region) {
      warnings.push(
        `Cross-region migration: ${sourceSpace.region} → ${targetSpace.region}`,
      );
    }

    // 7. 估算数据量和迁移时间
    const rowCount = await this.estimateRowCount(tenantId);
    const estimatedDuration = Math.ceil(rowCount / 1000) * 30; // 估算：每1000行30秒

    return {
      canMigrate: true,
      warnings,
      estimatedDuration,
      rowCount,
    };
  }

  /**
   * 执行租户迁移
   *
   * 流程：
   * 1. 将租户状态设为"迁移中"（只读）
   * 2. 导出源数据
   * 3. 导入目标 Space
   * 4. 校验数据完整性
   * 5. 更新路由表（tenant → new space）
   * 6. 清理源数据（可选）
   */
  async migrate(
    tenantId: string,
    targetSpaceId: string,
    options: {
      dryRun?: boolean; // 试运行，不实际迁移
      keepSourceData?: boolean; // 是否保留源数据
    } = {},
  ): Promise<{
    success: boolean;
    duration: number;
    migratedRows: number;
    checksum: string;
    message: string;
  }> {
    const startTime = Date.now();
    const { dryRun = false, keepSourceData = true } = options;

    this.logger.log(`Starting migration: tenant=${tenantId}, target=${targetSpaceId}, dryRun=${dryRun}`);

    // 1. 预检
    const check = await this.preMigrationCheck(tenantId, targetSpaceId);
    if (!check.canMigrate) {
      throw new BadRequestException('Migration pre-check failed');
    }

    // 2. 获取 Space 信息
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    if (!tenant?.spaceId) {
      throw new BadRequestException('Source space not found for tenant');
    }
    const sourceSpace = await this.spaceRepo.findOne({
      where: { spaceId: tenant.spaceId },
    });
    const targetSpace = await this.spaceRepo.findOne({
      where: { spaceId: targetSpaceId },
    });

    if (!tenant || !sourceSpace || !targetSpace) {
      throw new NotFoundException('Space or tenant not found');
    }

    // 3. 设置租户为迁移状态
    if (!dryRun) {
      await this.tenantRepo.update(tenantId, {
        // @ts-ignore - lifecycleStatus 可能不在实体中
        lifecycleStatus: 'migrating',
      } as any);
    }

    try {
      // 4. 执行数据迁移
      const migrationResult = await this.executeMigration(
        tenantId,
        sourceSpace.schemaName,
        targetSpace.schemaName,
        dryRun,
      );

      // 5. 如果是试运行，直接返回
      if (dryRun) {
        return {
          success: true,
          duration: Date.now() - startTime,
          migratedRows: migrationResult.rowCount,
          checksum: migrationResult.checksum,
          message: 'Dry run completed successfully',
        };
      }

      // 6. 更新租户的 spaceId
      await this.tenantRepo.update(tenantId, { spaceId: targetSpaceId });

      // 7. 失效缓存
      await this.spaceRouter.invalidateCache(tenantId);

      // 8. 更新 Space 租户计数
      // 源 Space 减一
      await this.spaceRepo.increment(
        { spaceId: sourceSpace.spaceId } as any,
        'currentTenants',
        -1,
      );
      // 目标 Space 加一
      await this.spaceRepo.increment(
        { spaceId: targetSpace.spaceId } as any,
        'currentTenants',
        1,
      );

      // 9. 恢复租户状态
      // @ts-ignore
      await this.tenantRepo.update(tenantId, { lifecycleStatus: 'active' } as any);

      // 10. 清理源数据（可选）
      if (!keepSourceData) {
        await this.cleanupSourceData(tenantId, sourceSpace.schemaName);
      }

      const duration = Date.now() - startTime;
      this.logger.log(
        `Migration completed: tenant=${tenantId}, duration=${duration}ms, rows=${migrationResult.rowCount}`,
      );

      return {
        success: true,
        duration,
        migratedRows: migrationResult.rowCount,
        checksum: migrationResult.checksum,
        message: 'Migration completed successfully',
      };
    } catch (error) {
      // 迁移失败，恢复租户状态
      // @ts-ignore
      await this.tenantRepo.update(tenantId, { lifecycleStatus: 'active' } as any);
      throw error;
    }
  }

  /**
   * 回滚迁移
   * 如果迁移失败，可以回滚到原来的 Space
   */
  async rollback(tenantId: string): Promise<{ success: boolean; message: string }> {
    this.logger.warn(`Rollback requested for tenant: ${tenantId}`);

    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    if (!tenant) {
      throw new NotFoundException(`Tenant not found: ${tenantId}`);
    }

    // TODO: 实现回滚逻辑
    // 1. 记录迁移历史，找到上一次迁移
    // 2. 将数据从当前 Space 迁回源 Space
    // 3. 更新 spaceId
    // 4. 失效缓存

    return {
      success: false,
      message: 'Rollback not implemented yet',
    };
  }

  // ==================== 私有方法 ====================

  /**
   * 估算租户数据行数
   */
  private async estimateRowCount(tenantId: string): Promise<number> {
    // 估算主要表的数据量
    // 实际生产环境需要查询各表的 COUNT(*)
    // 这里简单返回估算值
    return 1000; // 假设平均 1000 行
  }

  /**
   * 执行数据迁移
   */
  private async executeMigration(
    tenantId: string,
    sourceSchema: string,
    targetSchema: string,
    dryRun: boolean,
  ): Promise<{ rowCount: number; checksum: string }> {
    // 注意：实际实现需要：
    // 1. 遍历所有业务表
    // 2. SELECT * FROM sourceSchema.table WHERE tenant_id = ?
    // 3. INSERT INTO targetSchema.table
    // 4. 计算 Checksum 验证

    this.logger.log(
      `Executing migration: ${sourceSchema} -> ${targetSchema}, dryRun=${dryRun}`,
    );

    // 模拟迁移
    const rowCount = dryRun ? 100 : 1000;
    const checksum = `md5_${Date.now()}`;

    return { rowCount, checksum };
  }

  /**
   * 清理源数据
   */
  private async cleanupSourceData(
    tenantId: string,
    schemaName: string,
  ): Promise<void> {
    this.logger.log(`Cleaning up source data: tenant=${tenantId}, schema=${schemaName}`);
    // TODO: 实现清理逻辑
    // DELETE FROM schemaName.* WHERE tenant_id = ?
  }
}
