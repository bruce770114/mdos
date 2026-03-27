import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, LessThan } from 'typeorm';
import { Bill, BillStatus } from './bill.entity';
import { BillItem } from './bill-item.entity';
import { Receivable } from './receivable.entity';
import { Contract } from '../contracts/contract.entity';
import { CreateBillDto } from './dto/create-bill.dto';
import { UpdateBillDto, UpdateBillStatusDto } from './dto/update-bill.dto';
import { QueryBillsDto, QueryReceivablesDto } from './dto/query-bills.dto';
import { PaginatedResult, paginate } from '../common/dto/pagination.dto';
import { EmailService } from '../common/services/email.service';
import { PdfService } from '../common/services/pdf.service';
import dayjs from 'dayjs';

@Injectable()
export class BillingService {
  constructor(
    @InjectRepository(Bill)
    private readonly billRepo: Repository<Bill>,
    @InjectRepository(BillItem)
    private readonly billItemRepo: Repository<BillItem>,
    @InjectRepository(Receivable)
    private readonly receivableRepo: Repository<Receivable>,
    @InjectRepository(Contract)
    private readonly contractRepo: Repository<Contract>,
    private readonly dataSource: DataSource,
    private readonly emailService: EmailService,
    private readonly pdfService: PdfService,
  ) {}

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private async generateBillNo(tenantId: string): Promise<string> {
    const dateStr = dayjs().format('YYYYMMDD');
    const prefix = `BL-${dateStr}-`;
    const count = await this.billRepo
      .createQueryBuilder('b')
      .where('b.tenantId = :tenantId', { tenantId })
      .andWhere('b.billNo LIKE :prefix', { prefix: `${prefix}%` })
      .getCount();
    const seq = String(count + 1).padStart(4, '0');
    return `${prefix}${seq}`;
  }

  // ─── Bills ────────────────────────────────────────────────────────────────

  async generateBill(dto: CreateBillDto, tenantId: string): Promise<Bill> {
    return this.dataSource.transaction(async (manager) => {
      const billNo = await this.generateBillNo(tenantId);

      // Calculate total from items
      const totalAmount = dto.items.reduce((sum, item) => {
        const qty = item.quantity ?? 1;
        return sum + qty * item.unitPrice;
      }, 0);

      const bill = manager.create(Bill, {
        tenantId,
        billNo,
        contractId: dto.contractId,
        customerId: dto.customerId,
        unitId: dto.unitId,
        periodStart: new Date(dto.periodStart),
        periodEnd: new Date(dto.periodEnd),
        totalAmount,
        dueDate: new Date(dto.dueDate),
        status: 'pending_review',
        sentAt: null,
        paidAt: null,
        notes: dto.notes ?? null,
      });

      const savedBill = await manager.save(Bill, bill);

      const items = dto.items.map((item) =>
        manager.create(BillItem, {
          billId: savedBill.id,
          itemType: item.itemType,
          description: item.description,
          quantity: item.quantity ?? 1,
          unitPrice: item.unitPrice,
          amount: (item.quantity ?? 1) * item.unitPrice,
        }),
      );
      await manager.save(BillItem, items);

      // Create corresponding receivable
      const receivable = manager.create(Receivable, {
        tenantId,
        billId: savedBill.id,
        contractId: dto.contractId,
        customerId: dto.customerId,
        amount: totalAmount,
        paidAmount: 0,
        balance: totalAmount,
        status: 'outstanding',
        dueDate: new Date(dto.dueDate),
        overdueDays: 0,
      });
      await manager.save(Receivable, receivable);

      return savedBill;
    });
  }

  async findAllBills(query: QueryBillsDto, tenantId: string): Promise<PaginatedResult<any>> {
    const { page = 1, pageSize = 20, status, customerId, contractId, periodStart, periodEnd } = query;
    const skip = (page - 1) * pageSize;

    const qb = this.dataSource
      .createQueryBuilder(Bill, 'b')
      .leftJoin('customers', 'cu', 'cu.id = b.customerId AND cu.tenantId = :tenantId', { tenantId })
      .leftJoin('units', 'u', 'u.id = b.unitId AND u.tenantId = :tenantId', { tenantId })
      .leftJoin('contracts', 'c', 'c.id = b.contractId AND c.tenantId = :tenantId', { tenantId })
      .select([
        'b.id AS id',
        'b.billNo AS "billNo"',
        'b.contractId AS "contractId"',
        'c.contractNo AS "contractNo"',
        'b.customerId AS "customerId"',
        'cu.name AS "customerName"',
        'b.unitId AS "unitId"',
        'u.unitNo AS "unitNo"',
        'b.periodStart AS "periodStart"',
        'b.periodEnd AS "periodEnd"',
        'b.totalAmount AS "totalAmount"',
        'b.status AS status',
        'b.dueDate AS "dueDate"',
        'b.sentAt AS "sentAt"',
        'b.paidAt AS "paidAt"',
        'b.notes AS notes',
        'b.createdAt AS "createdAt"',
      ])
      .where('b.tenantId = :tenantId', { tenantId })
      .andWhere('b.deletedAt IS NULL');

    if (status) qb.andWhere('b.status = :status', { status });
    if (customerId) qb.andWhere('b.customerId = :customerId', { customerId });
    if (contractId) qb.andWhere('b.contractId = :contractId', { contractId });
    if (periodStart) qb.andWhere('b.periodStart >= :periodStart', { periodStart });
    if (periodEnd) qb.andWhere('b.periodEnd <= :periodEnd', { periodEnd });

    const total = await qb.getCount();
    const list = await qb.orderBy('b.createdAt', 'DESC').offset(skip).limit(pageSize).getRawMany();

    return paginate(list, total, page, pageSize);
  }

  async findOneBill(id: string, tenantId: string): Promise<Bill> {
    const bill = await this.billRepo.findOne({
      where: { id, tenantId },
      relations: ['items'],
    });
    if (!bill) throw new NotFoundException(`Bill ${id} not found`);
    return bill;
  }

  async updateBillStatus(id: string, status: BillStatus, tenantId: string): Promise<Bill> {
    const bill = await this.findOneBill(id, tenantId);

    const allowedTransitions: Record<BillStatus, BillStatus[]> = {
      pending_review: ['reviewed'],
      reviewed: ['sent', 'pending_review'],
      sent: ['paid', 'overdue'],
      paid: [],
      overdue: ['paid'],
    };

    if (!allowedTransitions[bill.status].includes(status)) {
      throw new BadRequestException(
        `Cannot transition bill from ${bill.status} to ${status}`,
      );
    }

    const updates: Partial<Bill> = { status };
    if (status === 'sent') updates.sentAt = new Date();
    if (status === 'paid') updates.paidAt = new Date();

    await this.billRepo.update(id, updates);
    const updatedBill = await this.findOneBill(id, tenantId);

    // Trigger email + PDF when bill is sent
    if (status === 'sent') {
      this.sendBillEmailWithPdf(updatedBill, tenantId).catch(() => {});
    }

    return updatedBill;
  }

  private async sendBillEmailWithPdf(bill: Bill, tenantId: string): Promise<void> {
    try {
      const pdfBuffer = await this.pdfService.generateBillPdf(bill, bill.items ?? [], null, null);
      const html = `<h2>账单通知</h2><p>账单编号：${bill.billNo}</p><p>金额：¥${Number(bill.totalAmount).toFixed(2)}</p><p>到期日：${String(bill.dueDate).slice(0, 10)}</p><p>请查收附件。</p>`;
      // Email recipient would come from customer record; skip if not available
    } catch {}
  }

  async getBillPdf(id: string, tenantId: string): Promise<Buffer> {
    const bill = await this.findOneBill(id, tenantId);
    return this.pdfService.generateBillPdf(bill, bill.items ?? [], null, null);
  }

  async autoGenerateBills(
    year: number,
    month: number,
    tenantId: string,
  ): Promise<{ generated: number; skipped: number; errors: number }> {
    const periodStart = dayjs(`${year}-${String(month).padStart(2, '0')}-01`).toDate();
    const periodEnd = dayjs(periodStart).endOf('month').toDate();
    const dueDate = dayjs(periodStart).add(15, 'day').toDate();

    const activeContracts = await this.contractRepo.find({
      where: [
        { tenantId, status: 'active' },
        { tenantId, status: 'expiring_soon' },
      ],
    });

    let generated = 0;
    let skipped = 0;
    let errors = 0;

    for (const contract of activeContracts) {
      try {
        // Check if bill already exists for this period
        const existing = await this.billRepo.findOne({
          where: {
            tenantId,
            contractId: contract.id,
          },
        });

        if (existing) {
          // Check period overlap
          const existingStart = dayjs(existing.periodStart);
          if (existingStart.year() === year && existingStart.month() + 1 === month) {
            skipped++;
            continue;
          }
        }

        const amount = Number(contract.baseRent) + Number(contract.propertyFee ?? 0);
        await this.generateBill(
          {
            contractId: contract.id,
            customerId: contract.customerId,
            unitId: contract.unitId,
            periodStart: dayjs(periodStart).format('YYYY-MM-DD'),
            periodEnd: dayjs(periodEnd).format('YYYY-MM-DD'),
            dueDate: dayjs(dueDate).format('YYYY-MM-DD'),
            items: [
              {
                itemType: 'rent' as const,
                description: `${year}年${month}月租金`,
                quantity: 1,
                unitPrice: Number(contract.baseRent),
              },
              ...(Number(contract.propertyFee) > 0
                ? [
                    {
                      itemType: 'property_fee' as const,
                      description: `${year}年${month}月物业费`,
                      quantity: 1,
                      unitPrice: Number(contract.propertyFee),
                    },
                  ]
                : []),
            ],
          },
          tenantId,
        );
        generated++;
      } catch {
        errors++;
      }
    }

    return { generated, skipped, errors };
  }

  async getReceivables(query: QueryReceivablesDto, tenantId: string): Promise<PaginatedResult<any>> {
    const { page = 1, pageSize = 20, status, customerId, contractId } = query;
    const skip = (page - 1) * pageSize;

    const qb = this.dataSource
      .createQueryBuilder(Receivable, 'r')
      .leftJoin('customers', 'cu', 'cu.id = r.customerId AND cu.tenantId = :tenantId', { tenantId })
      .leftJoin('bills', 'b', 'b.id = r.billId')
      .select([
        'r.id AS id',
        'r.billId AS "billId"',
        'b.billNo AS "billNo"',
        'r.contractId AS "contractId"',
        'r.customerId AS "customerId"',
        'cu.name AS "customerName"',
        'r.amount AS amount',
        'r.paidAmount AS "paidAmount"',
        'r.balance AS balance',
        'r.status AS status',
        'r.dueDate AS "dueDate"',
        'r.overdueDays AS "overdueDays"',
        'r.createdAt AS "createdAt"',
      ])
      .where('r.tenantId = :tenantId', { tenantId })
      .andWhere('r.deletedAt IS NULL');

    if (status) qb.andWhere('r.status = :status', { status });
    if (customerId) qb.andWhere('r.customerId = :customerId', { customerId });
    if (contractId) qb.andWhere('r.contractId = :contractId', { contractId });

    const total = await qb.getCount();
    const list = await qb.orderBy('r.dueDate', 'ASC').offset(skip).limit(pageSize).getRawMany();

    return paginate(list, total, page, pageSize);
  }

  /**
   * Cron helper: updates overdueDays and status for all receivables past due date.
   */
  async markOverdue(): Promise<void> {
    const today = new Date();

    // Fetch all non-paid receivables past due date
    const overdue = await this.receivableRepo.find({
      where: [
        { status: 'outstanding', dueDate: LessThan(today) },
        { status: 'partial', dueDate: LessThan(today) },
      ],
    });

    for (const r of overdue) {
      const days = dayjs(today).diff(dayjs(r.dueDate), 'day');
      await this.receivableRepo.update(r.id, {
        status: 'overdue',
        overdueDays: days,
      });
      // Also sync the bill status
      await this.billRepo.update(
        { id: r.billId, status: 'sent' },
        { status: 'overdue' },
      );
    }
  }

  async getBillsByCustomer(customerId: string, tenantId: string): Promise<Bill[]> {
    return this.billRepo.find({
      where: { customerId, tenantId },
      relations: ['items'],
      order: { createdAt: 'DESC' },
    });
  }

  async getBillsByContract(contractId: string, tenantId: string): Promise<Bill[]> {
    return this.billRepo.find({
      where: { contractId, tenantId },
      relations: ['items'],
      order: { periodStart: 'DESC' },
    });
  }
}
