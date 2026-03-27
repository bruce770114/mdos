import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contract } from '../contracts/contract.entity';
import { Receivable } from '../billing/receivable.entity';
import { Notification } from '../notifications/notification.entity';
import { Tenant } from '../tenants/tenant.entity';
import dayjs from 'dayjs';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    @InjectRepository(Contract)
    private readonly contractRepo: Repository<Contract>,
    @InjectRepository(Receivable)
    private readonly receivableRepo: Repository<Receivable>,
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
  ) {}

  /**
   * Every day at 02:00 — mark overdue receivables
   */
  @Cron('0 2 * * *')
  async markOverdueReceivables() {
    this.logger.log('Running: markOverdueReceivables');
    try {
      await this.receivableRepo
        .createQueryBuilder()
        .update()
        .set({ status: 'overdue' })
        .where("status NOT IN ('paid', 'overdue')")
        .andWhere('due_date < CURRENT_DATE')
        .execute();
      this.logger.log('markOverdueReceivables done');
    } catch (e) {
      this.logger.error('markOverdueReceivables failed', e);
    }
  }

  /**
   * Every day at 03:00 — check contracts expiring in 30/60/90 days
   */
  @Cron('0 3 * * *')
  async sendContractExpiryNotifications() {
    this.logger.log('Running: sendContractExpiryNotifications');
    try {
      const reminderDays = [30, 60, 90];
      for (const days of reminderDays) {
        const from = dayjs().add(days - 1, 'day').format('YYYY-MM-DD');
        const to = dayjs().add(days, 'day').format('YYYY-MM-DD');

        const expiringContracts = await this.contractRepo
          .createQueryBuilder('c')
          .where("c.status IN ('active', 'expiring_soon')")
          .andWhere('c.end_date >= :from', { from })
          .andWhere('c.end_date < :to', { to })
          .getMany();

        for (const contract of expiringContracts) {
          const key = `contract_expiry_${contract.id}_${days}d`;
          const existing = await this.notificationRepo.findOne({
            where: {
              tenantId: contract.tenantId,
              type: 'contract_reminder',
            },
          });
          // Simple dedup check by contract+days in metadata
          const alreadySent = await this.notificationRepo
            .createQueryBuilder('n')
            .where("n.tenant_id = :tid", { tid: contract.tenantId })
            .andWhere("n.type = 'contract_reminder'")
            .andWhere("n.metadata->>'contractId' = :cid", { cid: contract.id })
            .andWhere("(n.metadata->>'reminderDays')::int = :days", { days })
            .getOne();

          if (alreadySent) continue;

          await this.notificationRepo.save(
            this.notificationRepo.create({
              tenantId: contract.tenantId,
              userId: null,
              type: 'contract_reminder',
              title: `合同即将到期提醒（${days}天）`,
              content: `合同 ${contract.contractNo} 将于 ${dayjs(contract.endDate).format('YYYY-MM-DD')} 到期，请及时处理续约或终止。`,
              isRead: false,
              isProcessed: false,
              metadata: { contractId: contract.id, reminderDays: days },
            }),
          );
        }
      }

      // Mark contracts as expiring_soon (within 30 days)
      await this.contractRepo
        .createQueryBuilder()
        .update()
        .set({ status: 'expiring_soon' })
        .where("status = 'active'")
        .andWhere('end_date >= CURRENT_DATE')
        .andWhere("end_date <= CURRENT_DATE + INTERVAL '30 days'")
        .execute();

      // Mark expired contracts
      await this.contractRepo
        .createQueryBuilder()
        .update()
        .set({ status: 'expired' })
        .where("status IN ('active', 'expiring_soon')")
        .andWhere('end_date < CURRENT_DATE')
        .execute();

      this.logger.log('sendContractExpiryNotifications done');
    } catch (e) {
      this.logger.error('sendContractExpiryNotifications failed', e);
    }
  }

  /**
   * Every day at 06:00 — send overdue bill notifications
   */
  @Cron('0 6 * * *')
  async sendOverdueBillNotifications() {
    this.logger.log('Running: sendOverdueBillNotifications');
    try {
      const overdueReceivables = await this.receivableRepo
        .createQueryBuilder('r')
        .where("r.status = 'overdue'")
        .limit(200)
        .getMany();

      for (const receivable of overdueReceivables) {
        const alreadySent = await this.notificationRepo
          .createQueryBuilder('n')
          .where("n.tenant_id = :tid", { tid: receivable.tenantId })
          .andWhere("n.type = 'bill_overdue'")
          .andWhere("n.metadata->>'receivableId' = :rid", { rid: receivable.id })
          .getOne();

        if (alreadySent) continue;

        await this.notificationRepo.save(
          this.notificationRepo.create({
            tenantId: receivable.tenantId,
            userId: null,
            type: 'bill_overdue',
            title: '账单逾期未付提醒',
            content: `应收账款 ¥${Number(receivable.balance).toFixed(2)} 已逾期，请及时催收。到期日：${dayjs(receivable.dueDate).format('YYYY-MM-DD')}`,
            isRead: false,
            isProcessed: false,
            metadata: { receivableId: receivable.id },
          }),
        );
      }
      this.logger.log('sendOverdueBillNotifications done');
    } catch (e) {
      this.logger.error('sendOverdueBillNotifications failed', e);
    }
  }

  /**
   * Every day at 01:00 — check SaaS tenant lifecycle
   */
  @Cron('0 1 * * *')
  async checkTenantLifecycle() {
    this.logger.log('Running: checkTenantLifecycle');
    try {
      // Trial expired → suspended
      await this.tenantRepo
        .createQueryBuilder()
        .update()
        .set({ lifecycleStatus: 'suspended', status: 'suspended' })
        .where("lifecycle_status = 'trial'")
        .andWhere('trial_expires_at < NOW()')
        .execute();

      // Active subscription expired → grace period
      await this.tenantRepo
        .createQueryBuilder()
        .update()
        .set({ lifecycleStatus: 'grace' })
        .where("lifecycle_status = 'active'")
        .andWhere('subscription_expires_at IS NOT NULL')
        .andWhere('subscription_expires_at < NOW()')
        .execute();

      // Grace period > 7 days → suspended
      await this.tenantRepo
        .createQueryBuilder()
        .update()
        .set({ lifecycleStatus: 'suspended', status: 'suspended' })
        .where("lifecycle_status = 'grace'")
        .andWhere("subscription_expires_at < NOW() - INTERVAL '7 days'")
        .execute();

      this.logger.log('checkTenantLifecycle done');
    } catch (e) {
      this.logger.error('checkTenantLifecycle failed', e);
    }
  }

  /**
   * 1st of every month at 07:00 — auto-generate bills for previous month
   */
  @Cron('0 7 1 * *')
  async autoGenerateMonthlyBills() {
    this.logger.log('Running: autoGenerateMonthlyBills');
    try {
      const prevMonth = dayjs().subtract(1, 'month');
      const year = prevMonth.year();
      const month = prevMonth.month() + 1;

      // Get all active tenants
      const tenants = await this.tenantRepo.find({
        where: { status: 'active' },
      });

      for (const tenant of tenants) {
        try {
          // BillingService is not injected here to avoid circular deps;
          // Instead emit a notification to trigger manual generation
          await this.notificationRepo.save(
            this.notificationRepo.create({
              tenantId: tenant.id,
              userId: null,
              type: 'system',
              title: '月度账单生成提醒',
              content: `${year}年${month}月账单可以自动生成了，请前往账单管理页面操作。`,
              isRead: false,
              isProcessed: false,
              metadata: { year, month, action: 'auto_bill' },
            }),
          );
        } catch {}
      }

      this.logger.log('autoGenerateMonthlyBills done');
    } catch (e) {
      this.logger.error('autoGenerateMonthlyBills failed', e);
    }
  }
}
