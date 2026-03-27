import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BankStatement } from './entities/bank-statement.entity';
import { Receivable } from '../billing/receivable.entity';
import { PaginatedResult, paginate } from '../common/dto/pagination.dto';
import * as XLSX from 'xlsx';
import dayjs from 'dayjs';

@Injectable()
export class ReconciliationService {
  constructor(
    @InjectRepository(BankStatement)
    private readonly statementRepo: Repository<BankStatement>,
    @InjectRepository(Receivable)
    private readonly receivableRepo: Repository<Receivable>,
  ) {}

  async importStatements(buffer: Buffer, tenantId: string): Promise<{ imported: number }> {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet, { raw: false });

    const statements: Partial<BankStatement>[] = [];
    for (const row of rows) {
      const dateVal = row['交易日期'] || row['date'] || row['transactionDate'];
      const amountVal = row['金额'] || row['amount'];
      const ref = row['参考号'] || row['reference'] || '';
      const desc = row['描述'] || row['description'] || '';

      if (!dateVal || !amountVal) continue;
      const parsedDate = dayjs(dateVal, ['YYYY-MM-DD', 'YYYY/MM/DD', 'MM/DD/YYYY']).toDate();
      if (isNaN(parsedDate.getTime())) continue;

      statements.push({
        tenantId,
        transactionDate: parsedDate,
        amount: parseFloat(String(amountVal).replace(/,/g, '')),
        reference: String(ref) || null,
        description: String(desc) || null,
        matchStatus: 'unmatched',
        importedAt: new Date(),
      });
    }

    if (statements.length === 0) return { imported: 0 };

    const created = this.statementRepo.create(statements as BankStatement[]);
    await this.statementRepo.save(created);
    return { imported: statements.length };
  }

  async autoMatch(tenantId: string): Promise<{ matched: number }> {
    const unmatched = await this.statementRepo.find({
      where: { tenantId, matchStatus: 'unmatched' },
    });

    let matchedCount = 0;

    for (const stmt of unmatched) {
      const windowStart = dayjs(stmt.transactionDate).subtract(3, 'day').toDate();
      const windowEnd = dayjs(stmt.transactionDate).add(3, 'day').toDate();

      const candidates = await this.receivableRepo
        .createQueryBuilder('r')
        .where('r.tenantId = :tenantId', { tenantId })
        .andWhere("r.status IN ('outstanding', 'partial', 'overdue')")
        .andWhere('r.balance = :amount', { amount: stmt.amount })
        .andWhere('r.dueDate BETWEEN :start AND :end', { start: windowStart, end: windowEnd })
        .andWhere('r.deletedAt IS NULL')
        .getMany();

      if (candidates.length === 1) {
        await this.statementRepo.update(stmt.id, {
          matchedReceivableId: candidates[0].id,
          matchStatus: 'matched',
        });
        matchedCount++;
      }
    }

    return { matched: matchedCount };
  }

  async manualMatch(statementId: string, receivableId: string, tenantId: string): Promise<BankStatement> {
    const stmt = await this.statementRepo.findOne({ where: { id: statementId, tenantId } });
    if (!stmt) throw new NotFoundException('Bank statement not found');

    const receivable = await this.receivableRepo.findOne({ where: { id: receivableId, tenantId } });
    if (!receivable) throw new NotFoundException('Receivable not found');

    await this.statementRepo.update(statementId, {
      matchedReceivableId: receivableId,
      matchStatus: 'manual',
    });

    return this.statementRepo.findOne({ where: { id: statementId } }) as Promise<BankStatement>;
  }

  async unmatch(statementId: string, tenantId: string): Promise<BankStatement> {
    const stmt = await this.statementRepo.findOne({ where: { id: statementId, tenantId } });
    if (!stmt) throw new NotFoundException('Bank statement not found');

    await this.statementRepo.update(statementId, {
      matchedReceivableId: null,
      matchStatus: 'unmatched',
    });

    return this.statementRepo.findOne({ where: { id: statementId } }) as Promise<BankStatement>;
  }

  async getStatements(
    tenantId: string,
    page = 1,
    pageSize = 20,
    matchStatus?: string,
  ): Promise<PaginatedResult<any>> {
    const skip = (page - 1) * pageSize;

    const qb = this.statementRepo
      .createQueryBuilder('s')
      .where('s.tenantId = :tenantId', { tenantId });

    if (matchStatus) qb.andWhere('s.matchStatus = :matchStatus', { matchStatus });

    const total = await qb.getCount();
    const list = await qb
      .orderBy('s.transactionDate', 'DESC')
      .skip(skip)
      .take(pageSize)
      .getMany();

    return paginate(list, total, page, pageSize);
  }

  async getSummary(tenantId: string): Promise<{ total: number; matched: number; unmatched: number; totalAmount: number; matchedAmount: number }> {
    const rows = await this.statementRepo
      .createQueryBuilder('s')
      .select('s.matchStatus', 'matchStatus')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(s.amount)', 'amount')
      .where('s.tenantId = :tenantId', { tenantId })
      .groupBy('s.matchStatus')
      .getRawMany();

    let total = 0;
    let matched = 0;
    let unmatched = 0;
    let totalAmount = 0;
    let matchedAmount = 0;

    for (const row of rows) {
      const count = Number(row.count);
      const amount = Number(row.amount);
      total += count;
      totalAmount += amount;
      if (row.matchStatus === 'matched' || row.matchStatus === 'manual') {
        matched += count;
        matchedAmount += amount;
      } else {
        unmatched += count;
      }
    }

    return { total, matched, unmatched, totalAmount, matchedAmount };
  }
}
