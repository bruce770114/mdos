import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { AuditLog } from './audit-log.entity';
import { paginate, PaginatedResult } from '../common/dto/pagination.dto';

@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly logRepo: Repository<AuditLog>,
  ) {}

  async log(data: {
    tenantId?: string;
    userId?: string;
    username?: string;
    action: string;
    module: string;
    resourceId?: string;
    changes?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
    success?: boolean;
    errorMessage?: string;
  }): Promise<void> {
    const entry = this.logRepo.create({
      ...data,
      success: data.success ?? true,
    });
    // Fire-and-forget, don't block the main request
    this.logRepo.save(entry).catch(() => undefined);
  }

  async query(opts: {
    tenantId?: string;
    userId?: string;
    module?: string;
    action?: string;
    page?: number;
    pageSize?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<PaginatedResult<AuditLog>> {
    const page = opts.page ?? 1;
    const pageSize = opts.pageSize ?? 20;

    const qb = this.logRepo
      .createQueryBuilder('l')
      .orderBy('l.createdAt', 'DESC');

    if (opts.tenantId) qb.andWhere('l.tenantId = :tenantId', { tenantId: opts.tenantId });
    if (opts.userId) qb.andWhere('l.userId = :userId', { userId: opts.userId });
    if (opts.module) qb.andWhere('l.module = :module', { module: opts.module });
    if (opts.action) qb.andWhere('l.action = :action', { action: opts.action });
    if (opts.startDate) qb.andWhere('l.createdAt >= :startDate', { startDate: opts.startDate });
    if (opts.endDate) qb.andWhere('l.createdAt <= :endDate', { endDate: opts.endDate });

    qb.skip((page - 1) * pageSize).take(pageSize);
    const [list, total] = await qb.getManyAndCount();
    return paginate(list, total, page, pageSize);
  }
}
