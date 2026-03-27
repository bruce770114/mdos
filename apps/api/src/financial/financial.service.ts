import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Payment } from './payment.entity';
import { Receivable } from '../billing/receivable.entity';
import { CollectionRecord } from './entities/collection-record.entity';
import { RegisterPaymentDto } from './dto/register-payment.dto';
import { QueryFinancialDto } from './dto/query-financial.dto';
import { CreateCollectionRecordDto } from './dto/create-collection-record.dto';
import { PaginatedResult, paginate } from '../common/dto/pagination.dto';
import { AuditLogService } from '../audit-log/audit-log.service';
import dayjs from 'dayjs';

export interface ReceivablesSummary {
  totalOutstanding: number;
  totalOverdue: number;
  totalPaid: number;
  byStatus: Record<string, number>;
}

export interface IncomeReportEntry {
  year: number;
  month: number;
  totalIncome: number;
  paymentCount: number;
}

export interface AgingReport {
  current: number;
  days1To30: number;
  days31To60: number;
  days61To90: number;
  over90Days: number;
  totalOutstanding: number;
}

@Injectable()
export class FinancialService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(Receivable)
    private readonly receivableRepo: Repository<Receivable>,
    @InjectRepository(CollectionRecord)
    private readonly collectionRecordRepo: Repository<CollectionRecord>,
    private readonly dataSource: DataSource,
    private readonly auditLogService: AuditLogService,
  ) {}

  async registerPayment(dto: RegisterPaymentDto, tenantId: string, userId?: string): Promise<Payment> {
    return this.dataSource.transaction(async (manager) => {
      const receivable = await manager.findOne(Receivable, {
        where: { id: dto.receivableId, tenantId },
      });

      if (!receivable) {
        throw new NotFoundException(`Receivable ${dto.receivableId} not found`);
      }

      if (receivable.status === 'paid') {
        throw new BadRequestException('Receivable is already fully paid');
      }

      if (dto.amount > receivable.balance) {
        throw new BadRequestException(
          `Payment amount ${dto.amount} exceeds outstanding balance ${receivable.balance}`,
        );
      }

      const payment = manager.create(Payment, {
        tenantId,
        receivableId: dto.receivableId,
        customerId: dto.customerId,
        amount: dto.amount,
        paymentDate: new Date(dto.paymentDate),
        paymentMethod: dto.paymentMethod ?? 'bank_transfer',
        reference: dto.reference ?? null,
        notes: dto.notes ?? null,
      });

      await manager.save(Payment, payment);

      // Update receivable
      const newPaidAmount = Number(receivable.paidAmount) + Number(dto.amount);
      const newBalance = Number(receivable.amount) - newPaidAmount;
      let newStatus: Receivable['status'] = 'partial';
      if (newBalance <= 0) {
        newStatus = 'paid';
      } else if (new Date() > receivable.dueDate) {
        newStatus = 'overdue';
      }

      await manager.update(Receivable, receivable.id, {
        paidAmount: newPaidAmount,
        balance: Math.max(0, newBalance),
        status: newStatus,
      });

      this.auditLogService.log({
        tenantId,
        userId,
        action: 'REGISTER_PAYMENT',
        module: 'financial',
        resourceId: payment.id,
        changes: { amount: dto.amount, paymentMethod: dto.paymentMethod ?? 'bank_transfer' },
      });

      return payment;
    });
  }

  async getPayments(query: QueryFinancialDto, tenantId: string): Promise<PaginatedResult<any>> {
    const { page = 1, pageSize = 20, customerId, receivableId } = query;
    const skip = (page - 1) * pageSize;

    const qb = this.paymentRepo
      .createQueryBuilder('p')
      .where('p.tenantId = :tenantId', { tenantId })
      .andWhere('p.deletedAt IS NULL');

    if (customerId) qb.andWhere('p.customerId = :customerId', { customerId });
    if (receivableId) qb.andWhere('p.receivableId = :receivableId', { receivableId });

    const [list, total] = await qb
      .orderBy('p.paymentDate', 'DESC')
      .skip(skip)
      .take(pageSize)
      .getManyAndCount();

    return paginate(list, total, page, pageSize);
  }

  async getReceivablesSummary(tenantId: string): Promise<ReceivablesSummary> {
    const rows = await this.receivableRepo
      .createQueryBuilder('r')
      .select('r.status', 'status')
      .addSelect('SUM(r.balance)', 'totalBalance')
      .addSelect('COUNT(*)', 'count')
      .where('r.tenantId = :tenantId', { tenantId })
      .andWhere('r.deletedAt IS NULL')
      .groupBy('r.status')
      .getRawMany();

    const byStatus: Record<string, number> = {};
    let totalOutstanding = 0;
    let totalOverdue = 0;
    let totalPaid = 0;

    for (const row of rows) {
      byStatus[row.status] = Number(row.totalBalance);
      if (row.status === 'outstanding' || row.status === 'partial') {
        totalOutstanding += Number(row.totalBalance);
      }
      if (row.status === 'overdue') {
        totalOverdue += Number(row.totalBalance);
        totalOutstanding += Number(row.totalBalance);
      }
      if (row.status === 'paid') {
        totalPaid += Number(row.totalBalance);
      }
    }

    return { totalOutstanding, totalOverdue, totalPaid, byStatus };
  }

  async getIncomeReport(
    tenantId: string,
    year: number,
    month?: number,
  ): Promise<IncomeReportEntry[]> {
    const qb = this.paymentRepo
      .createQueryBuilder('p')
      .select('EXTRACT(YEAR FROM p.paymentDate)::int', 'year')
      .addSelect('EXTRACT(MONTH FROM p.paymentDate)::int', 'month')
      .addSelect('SUM(p.amount)', 'totalIncome')
      .addSelect('COUNT(*)', 'paymentCount')
      .where('p.tenantId = :tenantId', { tenantId })
      .andWhere('EXTRACT(YEAR FROM p.paymentDate) = :year', { year })
      .andWhere('p.deletedAt IS NULL');

    if (month) {
      qb.andWhere('EXTRACT(MONTH FROM p.paymentDate) = :month', { month });
    }

    const rows = await qb
      .groupBy('EXTRACT(YEAR FROM p.paymentDate)')
      .addGroupBy('EXTRACT(MONTH FROM p.paymentDate)')
      .orderBy('year', 'ASC')
      .addOrderBy('month', 'ASC')
      .getRawMany();

    return rows.map((r) => ({
      year: r.year,
      month: r.month,
      totalIncome: Number(r.totalIncome),
      paymentCount: Number(r.paymentCount),
    }));
  }

  async getAgingReport(tenantId: string): Promise<AgingReport> {
    const today = new Date();

    const receivables = await this.receivableRepo.find({
      where: [
        { tenantId, status: 'outstanding' },
        { tenantId, status: 'partial' },
        { tenantId, status: 'overdue' },
      ],
    });

    const report: AgingReport = {
      current: 0,
      days1To30: 0,
      days31To60: 0,
      days61To90: 0,
      over90Days: 0,
      totalOutstanding: 0,
    };

    for (const r of receivables) {
      const balance = Number(r.balance);
      report.totalOutstanding += balance;

      const dueDate = new Date(r.dueDate);
      if (today <= dueDate) {
        report.current += balance;
      } else {
        const overdueDays = dayjs(today).diff(dayjs(dueDate), 'day');
        if (overdueDays <= 30) {
          report.days1To30 += balance;
        } else if (overdueDays <= 60) {
          report.days31To60 += balance;
        } else if (overdueDays <= 90) {
          report.days61To90 += balance;
        } else {
          report.over90Days += balance;
        }
      }
    }

    return report;
  }

  async getPaymentsByReceivable(receivableId: string, tenantId: string): Promise<Payment[]> {
    return this.paymentRepo.find({
      where: { receivableId, tenantId },
      order: { paymentDate: 'DESC' },
    });
  }

  // ─── Collection Records ────────────────────────────────────────────────────

  async createCollectionRecord(
    dto: CreateCollectionRecordDto,
    tenantId: string,
    userId?: string,
  ): Promise<CollectionRecord> {
    const record = this.collectionRecordRepo.create({
      tenantId,
      receivableId: dto.receivableId,
      customerId: dto.customerId,
      level: dto.level,
      method: dto.method,
      notes: dto.notes ?? null,
      operatorId: userId ?? null,
    });
    return this.collectionRecordRepo.save(record);
  }

  async getCollectionRecords(tenantId: string, receivableId?: string, page = 1, pageSize = 20): Promise<PaginatedResult<CollectionRecord>> {
    const qb = this.collectionRecordRepo
      .createQueryBuilder('cr')
      .where('cr.tenantId = :tenantId', { tenantId });

    if (receivableId) qb.andWhere('cr.receivableId = :receivableId', { receivableId });

    const total = await qb.getCount();
    const list = await qb
      .orderBy('cr.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getMany();

    return paginate(list, total, page, pageSize);
  }

  async getOverdueReceivablesByLevel(tenantId: string): Promise<{
    L1: any[];
    L2: any[];
    L3: any[];
  }> {
    const today = dayjs();
    const overdueReceivables = await this.receivableRepo.find({
      where: [
        { tenantId, status: 'overdue' },
      ],
    });

    const L1: any[] = [];
    const L2: any[] = [];
    const L3: any[] = [];

    for (const r of overdueReceivables) {
      const overdueDays = today.diff(dayjs(r.dueDate), 'day');
      const record = { ...r, overdueDays };
      if (overdueDays <= 7) {
        L1.push(record);
      } else if (overdueDays <= 30) {
        L2.push(record);
      } else {
        L3.push(record);
      }
    }

    return { L1, L2, L3 };
  }
}
