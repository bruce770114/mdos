import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Project } from './entities/project.entity';
import { Building } from './entities/building.entity';
import { Floor } from './entities/floor.entity';
import { Unit, UnitStatus } from './entities/unit.entity';
import { FloorPlanVersion } from './entities/floor-plan-version.entity';
import { UnitChangeRecord } from './entities/unit-change-record.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { CreateBuildingDto } from './dto/create-building.dto';
import { CreateFloorDto } from './dto/create-floor.dto';
import { CreateUnitDto } from './dto/create-unit.dto';
import { QueryUnitsDto } from './dto/query-units.dto';
import { PaginatedResult, paginate } from '../common/dto/pagination.dto';
import dayjs from 'dayjs';

export interface UnitStatistics {
  total: number;
  vacant: number;
  rented: number;
  reserved: number;
  renovating: number;
  maintenance: number;
  vacancyRate: number;
}

@Injectable()
export class UnitsService {
  constructor(
    @InjectRepository(Project)
    private readonly projectsRepo: Repository<Project>,
    @InjectRepository(Building)
    private readonly buildingsRepo: Repository<Building>,
    @InjectRepository(Floor)
    private readonly floorsRepo: Repository<Floor>,
    @InjectRepository(Unit)
    private readonly unitsRepo: Repository<Unit>,
    @InjectRepository(FloorPlanVersion)
    private readonly versionRepo: Repository<FloorPlanVersion>,
    @InjectRepository(UnitChangeRecord)
    private readonly changeRecordRepo: Repository<UnitChangeRecord>,
    private readonly dataSource: DataSource,
  ) {}

  // ─── Projects ────────────────────────────────────────────────────────────────

  async createProject(dto: CreateProjectDto, tenantId: string): Promise<Project> {
    const project = this.projectsRepo.create({ ...dto, tenantId });
    return this.projectsRepo.save(project);
  }

  async findAllProjects(tenantId: string): Promise<Project[]> {
    return this.projectsRepo.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOneProject(id: string, tenantId: string): Promise<Project> {
    const project = await this.projectsRepo.findOne({
      where: { id, tenantId },
      relations: ['buildings'],
    });
    if (!project) {
      throw new NotFoundException(`Project ${id} not found`);
    }
    return project;
  }

  async updateProject(
    id: string,
    dto: Partial<CreateProjectDto>,
    tenantId: string,
  ): Promise<Project> {
    const project = await this.findOneProject(id, tenantId);
    Object.assign(project, dto);
    return this.projectsRepo.save(project);
  }

  async removeProject(id: string, tenantId: string): Promise<void> {
    const project = await this.findOneProject(id, tenantId);
    await this.projectsRepo.softRemove(project);
  }

  // ─── Buildings ────────────────────────────────────────────────────────────────

  async createBuilding(dto: CreateBuildingDto, tenantId: string): Promise<Building> {
    // Verify parent project belongs to this tenant
    await this.findOneProject(dto.projectId, tenantId);
    const building = this.buildingsRepo.create({ ...dto, tenantId });
    return this.buildingsRepo.save(building);
  }

  async findBuildingsByProject(projectId: string, tenantId: string): Promise<Building[]> {
    return this.buildingsRepo.find({
      where: { projectId, tenantId },
      order: { createdAt: 'ASC' },
    });
  }

  async findOneBuilding(id: string, tenantId: string): Promise<Building> {
    const building = await this.buildingsRepo.findOne({
      where: { id, tenantId },
      relations: ['project', 'floors'],
    });
    if (!building) {
      throw new NotFoundException(`Building ${id} not found`);
    }
    return building;
  }

  async updateBuilding(
    id: string,
    dto: Partial<CreateBuildingDto>,
    tenantId: string,
  ): Promise<Building> {
    const building = await this.findOneBuilding(id, tenantId);
    Object.assign(building, dto);
    return this.buildingsRepo.save(building);
  }

  async removeBuilding(id: string, tenantId: string): Promise<void> {
    const building = await this.findOneBuilding(id, tenantId);
    await this.buildingsRepo.softRemove(building);
  }

  // ─── Floors ───────────────────────────────────────────────────────────────────

  async createFloor(dto: CreateFloorDto, tenantId: string): Promise<Floor> {
    // Verify parent building belongs to this tenant
    await this.findOneBuilding(dto.buildingId, tenantId);
    const floor = this.floorsRepo.create({ ...dto, tenantId });
    return this.floorsRepo.save(floor);
  }

  async findFloorsByBuilding(buildingId: string, tenantId: string): Promise<Floor[]> {
    return this.floorsRepo.find({
      where: { buildingId, tenantId },
      order: { floorNo: 'ASC' },
    });
  }

  async findOneFloor(id: string, tenantId: string): Promise<Floor> {
    const floor = await this.floorsRepo.findOne({
      where: { id, tenantId },
      relations: ['building', 'units'],
    });
    if (!floor) {
      throw new NotFoundException(`Floor ${id} not found`);
    }
    return floor;
  }

  async updateFloor(
    id: string,
    dto: Partial<CreateFloorDto>,
    tenantId: string,
  ): Promise<Floor> {
    const floor = await this.findOneFloor(id, tenantId);
    Object.assign(floor, dto);
    return this.floorsRepo.save(floor);
  }

  async removeFloor(id: string, tenantId: string): Promise<void> {
    const floor = await this.findOneFloor(id, tenantId);
    await this.floorsRepo.softRemove(floor);
  }

  // ─── Units ────────────────────────────────────────────────────────────────────

  async createUnit(dto: CreateUnitDto, tenantId: string): Promise<Unit> {
    // Verify parent floor belongs to this tenant
    await this.findOneFloor(dto.floorId, tenantId);
    const unit = this.unitsRepo.create({ ...dto, tenantId });
    return this.unitsRepo.save(unit);
  }

  async findUnits(
    query: QueryUnitsDto,
    tenantId: string,
  ): Promise<PaginatedResult<Unit>> {
    const { page = 1, pageSize = 20, search, status, floorId, buildingId, projectId } = query;

    const qb = this.unitsRepo
      .createQueryBuilder('unit')
      .leftJoinAndSelect('unit.floor', 'floor')
      .leftJoinAndSelect('floor.building', 'building')
      .leftJoinAndSelect('building.project', 'project')
      .where('unit.tenantId = :tenantId', { tenantId });

    if (search) {
      qb.andWhere('unit.unitNo ILIKE :search', { search: `%${search}%` });
    }
    if (status) {
      qb.andWhere('unit.status = :status', { status });
    }
    if (floorId) {
      qb.andWhere('unit.floorId = :floorId', { floorId });
    }
    if (buildingId) {
      qb.andWhere('floor.buildingId = :buildingId', { buildingId });
    }
    if (projectId) {
      qb.andWhere('building.projectId = :projectId', { projectId });
    }

    qb.orderBy('unit.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [list, total] = await qb.getManyAndCount();
    return paginate(list, total, page, pageSize);
  }

  async findOneUnit(id: string, tenantId: string): Promise<Unit> {
    const unit = await this.unitsRepo.findOne({
      where: { id, tenantId },
      relations: ['floor', 'floor.building', 'floor.building.project'],
    });
    if (!unit) {
      throw new NotFoundException(`Unit ${id} not found`);
    }
    return unit;
  }

  async updateUnit(
    id: string,
    dto: Partial<CreateUnitDto>,
    tenantId: string,
  ): Promise<Unit> {
    const unit = await this.findOneUnit(id, tenantId);
    Object.assign(unit, dto);
    return this.unitsRepo.save(unit);
  }

  async removeUnit(id: string, tenantId: string): Promise<void> {
    const unit = await this.findOneUnit(id, tenantId);
    await this.unitsRepo.softRemove(unit);
  }

  async updateUnitStatus(
    id: string,
    status: UnitStatus,
    tenantId: string,
    userId: string,
  ): Promise<Unit> {
    const unit = await this.findOneUnit(id, tenantId);

    // Guard: prevent invalid transitions (rented units can only be vacated via contract flow)
    if (unit.status === 'rented' && status !== 'vacant' && status !== 'maintenance') {
      throw new ForbiddenException(
        'Rented units can only transition to vacant or maintenance status',
      );
    }

    unit.status = status;
    return this.unitsRepo.save(unit);
  }

  async getStatistics(tenantId: string): Promise<UnitStatistics> {
    const result = await this.unitsRepo
      .createQueryBuilder('unit')
      .select('unit.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('unit.tenantId = :tenantId', { tenantId })
      .groupBy('unit.status')
      .getRawMany<{ status: UnitStatus; count: string }>();

    const counts: Record<string, number> = {};
    let total = 0;
    for (const row of result) {
      counts[row.status] = parseInt(row.count, 10);
      total += counts[row.status];
    }

    const vacant = counts['vacant'] ?? 0;
    const rented = counts['rented'] ?? 0;
    const reserved = counts['reserved'] ?? 0;
    const renovating = counts['renovating'] ?? 0;
    const maintenance = counts['maintenance'] ?? 0;
    const vacancyRate = total > 0 ? Math.round((vacant / total) * 10000) / 100 : 0;

    return { total, vacant, rented, reserved, renovating, maintenance, vacancyRate };
  }

  // ─── Version Management ──────────────────────────────────────────────────────

  private async saveFloorSnapshot(
    floorId: string,
    tenantId: string,
    operatorId: string | null,
    notes?: string,
  ): Promise<FloorPlanVersion> {
    const units = await this.unitsRepo.find({ where: { floorId, tenantId } });
    const count = await this.versionRepo.count({ where: { floorId, tenantId } });
    const versionNo = `v${String(count + 1).padStart(3, '0')}`;

    const version = this.versionRepo.create({
      tenantId,
      floorId,
      versionNo,
      snapshot: units,
      operatorId,
      notes: notes ?? null,
    });
    return this.versionRepo.save(version);
  }

  async mergeUnits(
    unitIds: string[],
    newUnitNo: string,
    operatorId: string,
    tenantId: string,
  ): Promise<Unit> {
    if (unitIds.length < 2) {
      throw new BadRequestException('Need at least 2 units to merge');
    }

    const units = await this.unitsRepo.findByIds(unitIds);
    const filteredUnits = units.filter((u) => u.tenantId === tenantId);
    if (filteredUnits.length !== unitIds.length) {
      throw new NotFoundException('Some units not found');
    }

    for (const u of filteredUnits) {
      if (u.status !== 'vacant') {
        throw new BadRequestException(`Unit ${u.unitNo} is not vacant, cannot merge`);
      }
    }

    const floorId = filteredUnits[0].floorId;
    const totalArea = filteredUnits.reduce((sum, u) => sum + Number(u.area ?? 0), 0);

    const beforeSnapshot = filteredUnits;
    await this.saveFloorSnapshot(floorId, tenantId, operatorId, `合并前快照`);

    // Soft-delete old units
    for (const u of filteredUnits) {
      await this.unitsRepo.softRemove(u);
    }

    // Create merged unit
    const newUnit = await this.unitsRepo.save(
      this.unitsRepo.create({
        tenantId,
        floorId,
        unitNo: newUnitNo,
        area: totalArea,
        status: 'vacant',
      }),
    );

    await this.changeRecordRepo.save(
      this.changeRecordRepo.create({
        tenantId,
        floorId,
        changeType: 'merge',
        beforeSnapshot,
        afterSnapshot: [newUnit],
        operatorId,
        notes: `合并 ${unitIds.length} 个单元为 ${newUnitNo}`,
      }),
    );

    await this.saveFloorSnapshot(floorId, tenantId, operatorId, `合并后快照`);

    return newUnit;
  }

  async splitUnit(
    unitId: string,
    parts: Array<{ unitNo: string; area: number }>,
    operatorId: string,
    tenantId: string,
  ): Promise<Unit[]> {
    if (parts.length < 2) {
      throw new BadRequestException('Need at least 2 parts to split');
    }

    const unit = await this.findOneUnit(unitId, tenantId);
    if (unit.status !== 'vacant') {
      throw new BadRequestException('Unit must be vacant to split');
    }

    const floorId = unit.floorId;
    const beforeSnapshot = [unit];
    await this.saveFloorSnapshot(floorId, tenantId, operatorId, `切割前快照`);

    await this.unitsRepo.softRemove(unit);

    const newUnits: Unit[] = [];
    for (const part of parts) {
      const newUnit = await this.unitsRepo.save(
        this.unitsRepo.create({
          tenantId,
          floorId,
          unitNo: part.unitNo,
          area: part.area,
          status: 'vacant',
        }),
      );
      newUnits.push(newUnit);
    }

    await this.changeRecordRepo.save(
      this.changeRecordRepo.create({
        tenantId,
        floorId,
        changeType: 'split',
        beforeSnapshot,
        afterSnapshot: newUnits,
        operatorId,
        notes: `切割单元 ${unit.unitNo} 为 ${parts.length} 个子单元`,
      }),
    );

    await this.saveFloorSnapshot(floorId, tenantId, operatorId, `切割后快照`);

    return newUnits;
  }

  async getFloorVersions(floorId: string, tenantId: string): Promise<FloorPlanVersion[]> {
    return this.versionRepo.find({
      where: { floorId, tenantId },
      order: { createdAt: 'DESC' },
    });
  }

  async compareVersions(
    versionId1: string,
    versionId2: string,
    tenantId: string,
  ): Promise<{ before: any[]; after: any[]; added: any[]; removed: any[]; unchanged: any[] }> {
    const v1 = await this.versionRepo.findOne({ where: { id: versionId1, tenantId } });
    const v2 = await this.versionRepo.findOne({ where: { id: versionId2, tenantId } });

    if (!v1 || !v2) throw new NotFoundException('Version not found');

    const before: any[] = v1.snapshot ?? [];
    const after: any[] = v2.snapshot ?? [];

    const beforeIds = new Set(before.map((u) => u.id));
    const afterIds = new Set(after.map((u) => u.id));

    const added = after.filter((u) => !beforeIds.has(u.id));
    const removed = before.filter((u) => !afterIds.has(u.id));
    const unchanged = before.filter((u) => afterIds.has(u.id));

    return { before, after, added, removed, unchanged };
  }

  async getChangeRecords(
    tenantId: string,
    floorId?: string,
    page = 1,
    pageSize = 20,
  ): Promise<PaginatedResult<UnitChangeRecord>> {
    const qb = this.changeRecordRepo
      .createQueryBuilder('r')
      .where('r.tenantId = :tenantId', { tenantId });

    if (floorId) qb.andWhere('r.floorId = :floorId', { floorId });

    const total = await qb.getCount();
    const list = await qb
      .orderBy('r.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getMany();

    return paginate(list, total, page, pageSize);
  }
}
