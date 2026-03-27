import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as XLSX from 'xlsx';
import { Project } from '../units/entities/project.entity';
import { Building } from '../units/entities/building.entity';
import { Floor } from '../units/entities/floor.entity';
import { Unit } from '../units/entities/unit.entity';
import { Customer } from '../customers/customer.entity';
import { Contract } from '../contracts/contract.entity';

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

@Injectable()
export class DataImportService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(Building)
    private readonly buildingRepo: Repository<Building>,
    @InjectRepository(Floor)
    private readonly floorRepo: Repository<Floor>,
    @InjectRepository(Unit)
    private readonly unitRepo: Repository<Unit>,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    @InjectRepository(Contract)
    private readonly contractRepo: Repository<Contract>,
    private readonly dataSource: DataSource,
  ) {}

  // ─── Import ───────────────────────────────────────────────────────────────

  async importFromBuffer(buffer: Buffer, tenantId: string): Promise<ImportResult> {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const result: ImportResult = { imported: 0, skipped: 0, errors: [] };

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet);

      if (sheetName === 'Units') {
        const r = await this.importUnits(rows, tenantId);
        result.imported += r.imported;
        result.skipped += r.skipped;
        result.errors.push(...r.errors);
      } else if (sheetName === 'Customers') {
        const r = await this.importCustomers(rows, tenantId);
        result.imported += r.imported;
        result.skipped += r.skipped;
        result.errors.push(...r.errors);
      }
    }

    return result;
  }

  private async importUnits(rows: Record<string, any>[], tenantId: string): Promise<ImportResult> {
    const result: ImportResult = { imported: 0, skipped: 0, errors: [] };
    const projectCache = new Map<string, Project>();
    const buildingCache = new Map<string, Building>();
    const floorCache = new Map<string, Floor>();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // Excel row number (1-indexed + header)

      const projectName = String(row['项目名称'] ?? '').trim();
      const buildingName = String(row['楼宇名称'] ?? '').trim();
      const floorNo = parseInt(String(row['楼层'] ?? ''), 10);
      const unitNo = String(row['单元编号'] ?? '').trim();
      const unitName = String(row['单元名称'] ?? '').trim();
      const area = parseFloat(String(row['面积(m²)'] ?? '0'));
      const unitType = String(row['单元类型'] ?? 'office').trim();
      const status = String(row['状态'] ?? 'vacant').trim();

      if (!projectName || !buildingName || isNaN(floorNo) || !unitNo) {
        result.errors.push(`第 ${rowNum} 行: 缺少必要字段（项目名称/楼宇名称/楼层/单元编号）`);
        result.skipped++;
        continue;
      }

      try {
        // Resolve or create Project
        let project = projectCache.get(projectName);
        if (!project) {
          project = await this.projectRepo.findOne({ where: { tenantId, name: projectName } }) ?? undefined;
          if (!project) {
            project = await this.projectRepo.save(
              this.projectRepo.create({ tenantId, name: projectName, status: 'active' }),
            );
          }
          projectCache.set(projectName, project);
        }

        // Resolve or create Building
        const buildingKey = `${project.id}::${buildingName}`;
        let building = buildingCache.get(buildingKey);
        if (!building) {
          building = await this.buildingRepo.findOne({
            where: { tenantId, projectId: project.id, name: buildingName },
          }) ?? undefined;
          if (!building) {
            building = await this.buildingRepo.save(
              this.buildingRepo.create({
                tenantId,
                projectId: project.id,
                name: buildingName,
                floorCount: 1,
              }),
            );
          }
          buildingCache.set(buildingKey, building);
        }

        // Resolve or create Floor
        const floorKey = `${building.id}::${floorNo}`;
        let floor = floorCache.get(floorKey);
        if (!floor) {
          floor = await this.floorRepo.findOne({
            where: { tenantId, buildingId: building.id, floorNo },
          }) ?? undefined;
          if (!floor) {
            floor = await this.floorRepo.save(
              this.floorRepo.create({
                tenantId,
                buildingId: building.id,
                floorNo,
                floorName: `${floorNo}F`,
              }),
            );
          }
          floorCache.set(floorKey, floor);
        }

        // Check if unit already exists
        const existing = await this.unitRepo.findOne({
          where: { tenantId, floorId: floor.id, unitNo },
        });
        if (existing) {
          result.skipped++;
          continue;
        }

        await this.unitRepo.save(
          this.unitRepo.create({
            tenantId,
            floorId: floor.id,
            unitNo,
            area: isNaN(area) ? 0 : area,
            unitType: (['office', 'retail', 'warehouse', 'other'].includes(unitType)
              ? unitType
              : 'office') as any,
            status: (['vacant', 'rented', 'reserved', 'renovating', 'maintenance'].includes(status)
              ? status
              : 'vacant') as any,
          }),
        );
        result.imported++;
      } catch (err: any) {
        result.errors.push(`第 ${rowNum} 行: ${err?.message ?? '导入失败'}`);
        result.skipped++;
      }
    }

    return result;
  }

  private async importCustomers(rows: Record<string, any>[], tenantId: string): Promise<ImportResult> {
    const result: ImportResult = { imported: 0, skipped: 0, errors: [] };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      const companyName = String(row['客户名称'] ?? '').trim();
      const contactName = String(row['联系人'] ?? '').trim();
      const phone = String(row['联系电话'] ?? '').trim();
      const email = String(row['邮箱'] ?? '').trim() || null;
      const address = String(row['地址'] ?? '').trim() || null;

      if (!companyName || !contactName || !phone) {
        result.errors.push(`第 ${rowNum} 行: 缺少必要字段（客户名称/联系人/联系电话）`);
        result.skipped++;
        continue;
      }

      try {
        const existing = await this.customerRepo.findOne({
          where: { tenantId, companyName },
        });
        if (existing) {
          result.skipped++;
          continue;
        }

        await this.customerRepo.save(
          this.customerRepo.create({ tenantId, companyName, contactName, phone, email, address }),
        );
        result.imported++;
      } catch (err: any) {
        result.errors.push(`第 ${rowNum} 行: ${err?.message ?? '导入失败'}`);
        result.skipped++;
      }
    }

    return result;
  }

  // ─── Template ─────────────────────────────────────────────────────────────

  getImportTemplate(): Buffer {
    const workbook = XLSX.utils.book_new();

    const unitsSheet = XLSX.utils.aoa_to_sheet([
      ['项目名称', '楼宇名称', '楼层', '单元编号', '单元名称', '面积(m²)', '单元类型', '状态'],
      ['示例项目', 'A栋', '1', '101', '101室', '100', 'office', 'vacant'],
    ]);
    XLSX.utils.book_append_sheet(workbook, unitsSheet, 'Units');

    const customersSheet = XLSX.utils.aoa_to_sheet([
      ['客户名称', '客户类型', '联系人', '联系电话', '邮箱', '地址'],
      ['示例公司', '企业', '张三', '13800138000', 'example@example.com', '北京市朝阳区'],
    ]);
    XLSX.utils.book_append_sheet(workbook, customersSheet, 'Customers');

    return Buffer.from(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }));
  }

  // ─── Export ───────────────────────────────────────────────────────────────

  async exportToBuffer(tenantId: string): Promise<Buffer> {
    const workbook = XLSX.utils.book_new();

    // Projects + Buildings sheet
    const projects = await this.projectRepo.find({ where: { tenantId } });
    const buildings = await this.buildingRepo.find({ where: { tenantId } });
    const floors = await this.floorRepo.find({ where: { tenantId } });
    const units = await this.unitRepo.find({ where: { tenantId } });
    const customers = await this.customerRepo.find({ where: { tenantId } });
    const contracts = await this.contractRepo.find({ where: { tenantId } });

    // Build lookup maps
    const projectMap = new Map(projects.map((p) => [p.id, p]));
    const buildingMap = new Map(buildings.map((b) => [b.id, b]));
    const floorMap = new Map(floors.map((f) => [f.id, f]));
    const customerMap = new Map(customers.map((c) => [c.id, c]));

    // Units sheet
    const unitsData = [
      ['项目名称', '楼宇名称', '楼层', '单元编号', '面积(m²)', '单元类型', '状态', '创建时间'],
      ...units.map((u) => {
        const floor = floorMap.get(u.floorId);
        const building = floor ? buildingMap.get(floor.buildingId) : undefined;
        const project = building ? projectMap.get(building.projectId) : undefined;
        return [
          project?.name ?? '',
          building?.name ?? '',
          floor?.floorNo ?? '',
          u.unitNo,
          u.area,
          u.unitType,
          u.status,
          u.createdAt?.toISOString().substring(0, 10) ?? '',
        ];
      }),
    ];
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(unitsData), 'Units');

    // Customers sheet
    const customersData = [
      ['客户名称', '联系人', '联系电话', '邮箱', '地址', '客户等级', '创建时间'],
      ...customers.map((c) => [
        c.companyName,
        c.contactName,
        c.phone,
        c.email ?? '',
        c.address ?? '',
        c.grade ?? '',
        c.createdAt?.toISOString().substring(0, 10) ?? '',
      ]),
    ];
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(customersData), 'Customers');

    // Contracts sheet
    const contractsData = [
      ['合同编号', '客户名称', '开始日期', '结束日期', '基础租金', '合同状态', '创建时间'],
      ...contracts.map((c) => {
        const customer = customerMap.get(c.customerId);
        return [
          c.contractNo,
          customer?.companyName ?? '',
          c.startDate?.toISOString().substring(0, 10) ?? '',
          c.endDate?.toISOString().substring(0, 10) ?? '',
          c.baseRent,
          c.status,
          c.createdAt?.toISOString().substring(0, 10) ?? '',
        ];
      }),
    ];
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(contractsData), 'Contracts');

    return Buffer.from(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }));
  }
}
