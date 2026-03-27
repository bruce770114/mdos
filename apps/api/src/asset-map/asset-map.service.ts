import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

export interface ProjectMapItem {
  id: string;
  name: string;
  address: string;
  city: string | null;
  totalArea: number | null;
  lat: number | null;
  lng: number | null;
  totalUnits: number;
  vacantUnits: number;
  rentedUnits: number;
  occupancyRate: number;
}

export interface BuildingMapItem {
  id: string;
  name: string;
  projectId: string;
  floors: FloorSummary[];
}

export interface FloorSummary {
  floorId: string;
  floorNo: number;
  floorName: string;
  floorPlanUrl: string | null;
  totalUnits: number;
  vacantUnits: number;
  rentedUnits: number;
}

export interface UnitPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface UnitMapItem {
  id: string;
  unitNo: string;
  floorId: string;
  area: number | null;
  status: string;
  unitType: string;
  contractId: string | null;
  customerName: string | null;
  baseRent: number | null;
  position: UnitPosition | null;
}

@Injectable()
export class AssetMapService {
  constructor(private readonly dataSource: DataSource) {}

  async getProjects(tenantId: string): Promise<ProjectMapItem[]> {
    const rows = await this.dataSource
      .createQueryBuilder()
      .select([
        'p.id AS id',
        'p.name AS name',
        'p.address AS address',
        'p.city AS city',
        'p.totalArea AS "totalArea"',
        'p.lat AS lat',
        'p.lng AS lng',
        'COUNT(u.id) AS "totalUnits"',
        `SUM(CASE WHEN u.status = 'vacant' THEN 1 ELSE 0 END) AS "vacantUnits"`,
        `SUM(CASE WHEN u.status = 'rented' THEN 1 ELSE 0 END) AS "rentedUnits"`,
      ])
      .from('projects', 'p')
      .leftJoin('buildings', 'b', 'b.projectId = p.id AND b.tenantId = :tenantId AND b.deletedAt IS NULL', { tenantId })
      .leftJoin('floors', 'f', 'f.buildingId = b.id AND f.deletedAt IS NULL')
      .leftJoin('units', 'u', 'u.floorId = f.id AND u.tenantId = :tenantId AND u.deletedAt IS NULL', { tenantId })
      .where('p.tenantId = :tenantId', { tenantId })
      .andWhere('p.deletedAt IS NULL')
      .groupBy('p.id')
      .orderBy('p.name', 'ASC')
      .getRawMany();

    return rows.map((r) => {
      const total = Number(r.totalUnits) || 0;
      const rented = Number(r.rentedUnits) || 0;
      return {
        id: r.id,
        name: r.name,
        address: r.address,
        city: r.city ?? null,
        totalArea: r.totalArea ? Number(r.totalArea) : null,
        lat: r.lat ? Number(r.lat) : null,
        lng: r.lng ? Number(r.lng) : null,
        totalUnits: total,
        vacantUnits: Number(r.vacantUnits) || 0,
        rentedUnits: rented,
        occupancyRate: total > 0 ? Math.round((rented / total) * 100 * 10) / 10 : 0,
      };
    });
  }

  async getProjectBuildings(projectId: string, tenantId: string): Promise<BuildingMapItem[]> {
    const rows = await this.dataSource
      .createQueryBuilder()
      .select([
        'b.id AS "buildingId"',
        'b.name AS "buildingName"',
        'f.id AS "floorId"',
        'f.floorNo AS "floorNo"',
        'f.floorName AS "floorName"',
        'f.floorPlanUrl AS "floorPlanUrl"',
        'COUNT(u.id) AS "totalUnits"',
        `SUM(CASE WHEN u.status = 'vacant' THEN 1 ELSE 0 END) AS "vacantUnits"`,
        `SUM(CASE WHEN u.status = 'rented' THEN 1 ELSE 0 END) AS "rentedUnits"`,
      ])
      .from('buildings', 'b')
      .innerJoin('floors', 'f', 'f.buildingId = b.id AND f.deletedAt IS NULL')
      .leftJoin('units', 'u', 'u.floorId = f.id AND u.tenantId = :tenantId AND u.deletedAt IS NULL', { tenantId })
      .where('b.projectId = :projectId', { projectId })
      .andWhere('b.tenantId = :tenantId', { tenantId })
      .andWhere('b.deletedAt IS NULL')
      .groupBy('b.id, b.name, f.id, f.floorNo, f.floorName, f.floorPlanUrl')
      .orderBy('b.name', 'ASC')
      .addOrderBy('f.floorNo', 'ASC')
      .getRawMany();

    // Group floors under buildings
    const buildingMap = new Map<string, BuildingMapItem>();
    for (const row of rows) {
      if (!buildingMap.has(row.buildingId)) {
        buildingMap.set(row.buildingId, {
          id: row.buildingId,
          name: row.buildingName,
          projectId,
          floors: [],
        });
      }
      buildingMap.get(row.buildingId)!.floors.push({
        floorId: row.floorId,
        floorNo: Number(row.floorNo),
        floorName: row.floorName ?? `${row.floorNo}F`,
        floorPlanUrl: row.floorPlanUrl ?? null,
        totalUnits: Number(row.totalUnits) || 0,
        vacantUnits: Number(row.vacantUnits) || 0,
        rentedUnits: Number(row.rentedUnits) || 0,
      });
    }

    return Array.from(buildingMap.values());
  }

  async getFloorUnits(floorId: string, tenantId: string): Promise<UnitMapItem[]> {
    const rows = await this.dataSource
      .createQueryBuilder()
      .select([
        'u.id AS id',
        'u.unitNo AS "unitNo"',
        'u.floorId AS "floorId"',
        'u.area AS area',
        'u.status AS status',
        'u.unitType AS "unitType"',
        'u.position AS position',
        'c.id AS "contractId"',
        'cu.name AS "customerName"',
        'c.baseRent AS "baseRent"',
      ])
      .from('units', 'u')
      .leftJoin(
        'contracts',
        'c',
        `c.unitId = u.id
         AND c.tenantId = :tenantId
         AND c.status IN ('active', 'expiring_soon')
         AND c.deletedAt IS NULL`,
        { tenantId },
      )
      .leftJoin(
        'customers',
        'cu',
        'cu.id = c.customerId AND cu.tenantId = :tenantId AND cu.deletedAt IS NULL',
        { tenantId },
      )
      .where('u.floorId = :floorId', { floorId })
      .andWhere('u.tenantId = :tenantId', { tenantId })
      .andWhere('u.deletedAt IS NULL')
      .orderBy('u.unitNo', 'ASC')
      .getRawMany();

    return rows.map((r) => ({
      id: r.id,
      unitNo: r.unitNo,
      floorId: r.floorId,
      area: r.area ? Number(r.area) : null,
      status: r.status,
      unitType: r.unitType ?? 'office',
      position: r.position ?? null,
      contractId: r.contractId ?? null,
      customerName: r.customerName ?? null,
      baseRent: r.baseRent ? Number(r.baseRent) : null,
    }));
  }
}
