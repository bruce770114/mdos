import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from './notification.entity';
import { QueryNotificationsDto } from './dto/query-notifications.dto';
import { PaginatedResult, paginate } from '../common/dto/pagination.dto';
import { ContractsService } from '../contracts/contracts.service';

export interface CreateNotificationData {
  tenantId: string;
  userId: string;
  type: NotificationType;
  title: string;
  content: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    private readonly contractsService: ContractsService,
  ) {}

  // ─── Internal creation ────────────────────────────────────────────────────

  async create(data: CreateNotificationData): Promise<Notification> {
    const notification = this.notificationRepo.create({
      tenantId: data.tenantId,
      userId: data.userId,
      type: data.type,
      title: data.title,
      content: data.content,
      isRead: false,
      isProcessed: false,
      metadata: data.metadata ?? null,
    });
    return this.notificationRepo.save(notification);
  }

  // ─── Query ────────────────────────────────────────────────────────────────

  async findAll(
    userId: string,
    tenantId: string,
    query: QueryNotificationsDto,
  ): Promise<PaginatedResult<Notification> & { unreadCount: number }> {
    const { page = 1, pageSize = 20, type, isRead } = query;
    const skip = (page - 1) * pageSize;

    const qb = this.notificationRepo
      .createQueryBuilder('n')
      .where('n.userId = :userId', { userId })
      .andWhere('n.tenantId = :tenantId', { tenantId })
      .andWhere('n.deletedAt IS NULL');

    if (type) qb.andWhere('n.type = :type', { type });
    if (isRead !== undefined) qb.andWhere('n.isRead = :isRead', { isRead });

    const [list, total] = await qb
      .orderBy('n.createdAt', 'DESC')
      .skip(skip)
      .take(pageSize)
      .getManyAndCount();

    const unreadCount = await this.notificationRepo.count({
      where: { userId, tenantId, isRead: false },
    });

    return { ...paginate(list, total, page, pageSize), unreadCount };
  }

  async markRead(id: string, userId: string, tenantId: string): Promise<Notification> {
    const notification = await this.notificationRepo.findOne({
      where: { id, tenantId },
    });
    if (!notification) throw new NotFoundException(`Notification ${id} not found`);
    if (notification.userId !== userId) {
      throw new ForbiddenException('Cannot mark another user\'s notification as read');
    }

    await this.notificationRepo.update(id, { isRead: true });
    return { ...notification, isRead: true };
  }

  async markAllRead(userId: string, tenantId: string): Promise<{ affected: number }> {
    const result = await this.notificationRepo
      .createQueryBuilder()
      .update(Notification)
      .set({ isRead: true })
      .where('userId = :userId', { userId })
      .andWhere('tenantId = :tenantId', { tenantId })
      .andWhere('isRead = :isRead', { isRead: false })
      .execute();

    return { affected: result.affected ?? 0 };
  }

  async getUnreadCount(userId: string, tenantId: string): Promise<{ count: number }> {
    const count = await this.notificationRepo.count({
      where: { userId, tenantId, isRead: false },
    });
    return { count };
  }

  // ─── Cron helpers ─────────────────────────────────────────────────────────

  /**
   * Sends contract expiry reminder notifications.
   * Intended to be called by a scheduler (e.g., @Cron).
   * Creates notifications for contracts expiring within 30 days for all tenants.
   */
  async sendContractExpiryReminders(): Promise<void> {
    // We query contracts expiring in 30 days across all tenants.
    // For each we create a notification for the relevant users.
    // NOTE: In production this would iterate over tenant IDs from a tenants service.
    // Here we use a raw query to find expiring contracts with their tenant and assigned users.
    const expiringContracts = await this.notificationRepo.manager
      .createQueryBuilder()
      .select([
        'c.id AS "contractId"',
        'c.tenantId AS "tenantId"',
        'c.contractNo AS "contractNo"',
        'c.endDate AS "endDate"',
        'c.customerId AS "customerId"',
      ])
      .from('contracts', 'c')
      .where("c.status IN ('active', 'expiring_soon')")
      .andWhere('c.deletedAt IS NULL')
      .andWhere('c.endDate BETWEEN NOW() AND NOW() + INTERVAL \'30 days\'')
      .getRawMany();

    for (const contract of expiringContracts) {
      // Check if we already sent a reminder for this contract today
      const existing = await this.notificationRepo.findOne({
        where: {
          tenantId: contract.tenantId,
          type: 'contract_reminder',
          isProcessed: false,
        },
      });

      if (existing) continue;

      // Create a system notification - in production, fetch assigned user IDs
      // Here we create a broadcast notification with userId = 'system'
      await this.create({
        tenantId: contract.tenantId,
        userId: 'system',
        type: 'contract_reminder',
        title: 'Contract Expiry Reminder',
        content: `Contract ${contract.contractNo} is expiring on ${new Date(contract.endDate).toLocaleDateString()}. Please review and take action.`,
        metadata: {
          contractId: contract.contractId,
          contractNo: contract.contractNo,
          endDate: contract.endDate,
        },
      });
    }
  }
}
