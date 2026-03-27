import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Between } from 'typeorm';
import { Contract, ContractStatus } from './contract.entity';
import { ContractRentRule } from './contract-rent-rule.entity';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto, TerminateContractDto } from './dto/update-contract.dto';
import { QueryContractsDto } from './dto/query-contracts.dto';
import { PaginatedResult, paginate } from '../common/dto/pagination.dto';
import { AuditLogService } from '../audit-log/audit-log.service';
import dayjs from 'dayjs';

@Injectable()
export class ContractsService {
  constructor(
    @InjectRepository(Contract)
    private readonly contractRepo: Repository<Contract>,
    @InjectRepository(ContractRentRule)
    private readonly rentRuleRepo: Repository<ContractRentRule>,
    private readonly dataSource: DataSource,
    private readonly auditLogService: AuditLogService,
  ) {}

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private async generateContractNo(tenantId: string): Promise<string> {
    const dateStr = dayjs().format('YYYYMMDD');
    const prefix = `HT-${dateStr}-`;
    const count = await this.contractRepo
      .createQueryBuilder('c')
      .where('c.tenantId = :tenantId', { tenantId })
      .andWhere('c.contractNo LIKE :prefix', { prefix: `${prefix}%` })
      .getCount();
    const seq = String(count + 1).padStart(4, '0');
    return `${prefix}${seq}`;
  }

  // ─── CRUD ─────────────────────────────────────────────────────────────────

  async create(dto: CreateContractDto, tenantId: string): Promise<Contract> {
    return this.dataSource.transaction(async (manager) => {
      const contractNo = await this.generateContractNo(tenantId);

      const contract = manager.create(Contract, {
        tenantId,
        contractNo,
        customerId: dto.customerId,
        unitId: dto.unitId,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        rentFreeDays: dto.rentFreeDays ?? 0,
        baseRent: dto.baseRent,
        propertyFee: dto.propertyFee ?? 0,
        billingType: dto.billingType ?? 'fixed',
        status: 'draft',
        signedDate: dto.signedDate ? new Date(dto.signedDate) : null,
        totalAmount: dto.totalAmount ?? null,
        notes: dto.notes ?? null,
      });

      const saved = await manager.save(Contract, contract);

      if (dto.rules && dto.rules.length > 0) {
        const rules = dto.rules.map((r) =>
          manager.create(ContractRentRule, {
            contractId: saved.id,
            ruleType: r.ruleType,
            params: r.params,
            effectiveFrom: new Date(r.effectiveFrom),
            effectiveTo: r.effectiveTo ? new Date(r.effectiveTo) : null,
          }),
        );
        await manager.save(ContractRentRule, rules);
      }

      return saved;
    });
  }

  async findAll(query: QueryContractsDto, tenantId: string): Promise<PaginatedResult<any>> {
    const { page = 1, pageSize = 20, status, customerId, unitId, expiringDays, search } = query;
    const skip = (page - 1) * pageSize;

    const qb = this.dataSource
      .createQueryBuilder(Contract, 'c')
      .leftJoin('customers', 'cu', 'cu.id = c.customerId AND cu.tenantId = :tenantId', { tenantId })
      .leftJoin('units', 'u', 'u.id = c.unitId AND u.tenantId = :tenantId', { tenantId })
      .select([
        'c.id AS id',
        'c.contractNo AS "contractNo"',
        'c.customerId AS "customerId"',
        'cu.name AS "customerName"',
        'c.unitId AS "unitId"',
        'u.unitNo AS "unitNo"',
        'c.startDate AS "startDate"',
        'c.endDate AS "endDate"',
        'c.baseRent AS "baseRent"',
        'c.propertyFee AS "propertyFee"',
        'c.billingType AS "billingType"',
        'c.status AS status',
        'c.rentFreeDays AS "rentFreeDays"',
        'c.totalAmount AS "totalAmount"',
        'c.signedDate AS "signedDate"',
        'c.notes AS notes',
        'c.createdAt AS "createdAt"',
        'c.updatedAt AS "updatedAt"',
      ])
      .where('c.tenantId = :tenantId', { tenantId })
      .andWhere('c.deletedAt IS NULL');

    if (status) qb.andWhere('c.status = :status', { status });
    if (customerId) qb.andWhere('c.customerId = :customerId', { customerId });
    if (unitId) qb.andWhere('c.unitId = :unitId', { unitId });

    if (expiringDays) {
      const today = dayjs().format('YYYY-MM-DD');
      const future = dayjs().add(expiringDays, 'day').format('YYYY-MM-DD');
      qb.andWhere('c.endDate BETWEEN :today AND :future', {
        today,
        future,
      });
    }

    if (search) {
      qb.andWhere('(c.contractNo ILIKE :search OR cu.name ILIKE :search)', {
        search: `%${search}%`,
      });
    }

    const total = await qb.getCount();
    const list = await qb.orderBy('c.createdAt', 'DESC').offset(skip).limit(pageSize).getRawMany();

    return paginate(list, total, page, pageSize);
  }

  async findOne(id: string, tenantId: string): Promise<Contract> {
    const contract = await this.contractRepo.findOne({
      where: { id, tenantId },
      relations: ['rules'],
    });
    if (!contract) throw new NotFoundException(`Contract ${id} not found`);
    return contract;
  }

  async update(id: string, dto: UpdateContractDto, tenantId: string): Promise<Contract> {
    const contract = await this.findOne(id, tenantId);

    if (contract.status !== 'draft' && contract.status !== 'pending_approval') {
      throw new ForbiddenException('Only draft or pending_approval contracts can be edited');
    }

    const updates: Record<string, unknown> = {};
    if (dto.customerId !== undefined) updates['customerId'] = dto.customerId;
    if (dto.unitId !== undefined) updates['unitId'] = dto.unitId;
    if (dto.startDate !== undefined) updates['startDate'] = new Date(dto.startDate);
    if (dto.endDate !== undefined) updates['endDate'] = new Date(dto.endDate);
    if (dto.rentFreeDays !== undefined) updates['rentFreeDays'] = dto.rentFreeDays;
    if (dto.baseRent !== undefined) updates['baseRent'] = dto.baseRent;
    if (dto.propertyFee !== undefined) updates['propertyFee'] = dto.propertyFee;
    if (dto.billingType !== undefined) updates['billingType'] = dto.billingType;
    if (dto.signedDate !== undefined) updates['signedDate'] = new Date(dto.signedDate);
    if (dto.totalAmount !== undefined) updates['totalAmount'] = dto.totalAmount;
    if (dto.notes !== undefined) updates['notes'] = dto.notes;

    await this.contractRepo.update(id, updates as Parameters<typeof this.contractRepo.update>[1]);
    return this.findOne(id, tenantId);
  }

  async remove(id: string, tenantId: string): Promise<void> {
    const contract = await this.findOne(id, tenantId);
    if (contract.status !== 'draft') {
      throw new ForbiddenException('Only draft contracts can be deleted');
    }
    await this.contractRepo.softDelete(id);
  }

  async updateStatus(
    id: string,
    status: ContractStatus,
    tenantId: string,
    userId: string,
  ): Promise<Contract> {
    const contract = await this.findOne(id, tenantId);

    const allowedTransitions: Record<ContractStatus, ContractStatus[]> = {
      draft: ['pending_approval'],
      pending_approval: ['active', 'draft'],
      active: ['expiring_soon', 'terminated'],
      expiring_soon: ['active', 'expired', 'terminated'],
      expired: [],
      terminated: [],
    };

    if (!allowedTransitions[contract.status].includes(status)) {
      throw new BadRequestException(
        `Cannot transition from ${contract.status} to ${status}`,
      );
    }

    await this.contractRepo.update(id, { status });
    this.auditLogService.log({
      tenantId,
      userId,
      action: 'STATUS_CHANGE',
      module: 'contracts',
      resourceId: id,
      changes: { from: contract.status, to: status },
    });
    return this.findOne(id, tenantId);
  }

  async findExpiring(days: 30 | 60 | 90, tenantId: string): Promise<Contract[]> {
    const today = dayjs().toDate();
    const future = dayjs().add(days, 'day').toDate();

    return this.contractRepo.find({
      where: {
        tenantId,
        status: 'active',
        endDate: Between(today, future),
      },
      order: { endDate: 'ASC' },
    });
  }

  async terminate(
    id: string,
    dto: TerminateContractDto,
    tenantId: string,
    userId: string,
  ): Promise<Contract> {
    const contract = await this.findOne(id, tenantId);

    if (!['active', 'expiring_soon'].includes(contract.status)) {
      throw new ForbiddenException('Only active or expiring_soon contracts can be terminated');
    }

    const notes = contract.notes
      ? `${contract.notes}\n[Terminated by ${userId}]: ${dto.reason}`
      : `[Terminated by ${userId}]: ${dto.reason}`;

    await this.contractRepo.update(id, { status: 'terminated', notes });
    return this.findOne(id, tenantId);
  }

  async getContractsByCustomer(customerId: string, tenantId: string): Promise<Contract[]> {
    return this.contractRepo.find({
      where: { customerId, tenantId },
      relations: ['rules'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Cron job helper: marks contracts as expiring_soon (within 30 days) or expired.
   * Intended to be called by a scheduler (e.g., @Cron).
   */
  async checkAndUpdateExpiringStatus(): Promise<void> {
    const today = dayjs().format('YYYY-MM-DD');
    const in30Days = dayjs().add(30, 'day').format('YYYY-MM-DD');

    // Mark active contracts ending within 30 days as expiring_soon
    await this.contractRepo
      .createQueryBuilder()
      .update(Contract)
      .set({ status: 'expiring_soon' })
      .where('status = :status', { status: 'active' })
      .andWhere('endDate <= :in30Days', { in30Days })
      .andWhere('endDate >= :today', { today })
      .execute();

    // Mark contracts past end date as expired (active or expiring_soon)
    await this.contractRepo
      .createQueryBuilder()
      .update(Contract)
      .set({ status: 'expired' })
      .where('status IN (:...statuses)', { statuses: ['active', 'expiring_soon'] })
      .andWhere('endDate < :today', { today })
      .execute();
  }
}
