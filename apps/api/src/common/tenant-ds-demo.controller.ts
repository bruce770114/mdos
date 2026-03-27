import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { TenantDataSourceService } from '../common/services/tenant-datasource.service';
import { SpaceRouterService } from '../common/services/space-router.service';
import { TenantSpaceInfo } from '../common/services/space-router.service';
import { Unit } from '../units/entities/unit.entity';
import { Project } from '../units/entities/project.entity';
import { Public } from '../common/decorators';

@ApiTags('TenantDS-Demo')
@Controller('demo/tenant-ds')
export class TenantDsDemoController {
  constructor(
    private readonly tenantDs: TenantDataSourceService,
    private readonly spaceRouter: SpaceRouterService,
  ) {}

  @Get('space-info')
  @ApiOperation({ summary: 'Demo: 获取当前租户的 Space 信息' })
  getSpaceInfo(@Request() req: any) {
    if (req.tenantSpace) {
      return req.tenantSpace;
    }
    return { message: 'No tenantSpace found, are you using SpaceInterceptor?' };
  }

  @Get('units')
  @ApiOperation({ summary: 'Demo: 使用 TenantDataSourceService 查询 Units' })
  async findAllUnits(@Request() req: any) {
    const repo = await this.tenantDs.getRepository(Unit, req);
    return repo.find({ take: 10 });
  }

  @Get('units-with-building')
  @ApiOperation({ summary: 'Demo: 使用 createQueryBuilder 关联查询' })
  async findUnitsWithBuilding(@Request() req: any) {
    const qb = await this.tenantDs.createQueryBuilder(Unit, req, 'u');
    return qb
      .leftJoinAndSelect('u.floor', 'floor')
      .leftJoinAndSelect('floor.building', 'building')
      .where('u.status = :status', { status: 'vacant' })
      .take(10)
      .getMany();
  }

  @Get('projects-decorator')
  @ApiOperation({ summary: 'Demo: 使用 TenantDataSourceService 查询 Projects' })
  async findProjectsDecorator(@Request() req: any) {
    const tenantSpace: TenantSpaceInfo = req.tenantSpace;
    if (!tenantSpace) {
      return { message: 'No tenant space info' };
    }
    const repo = await this.tenantDs.getRepository(Project, { tenantSpace });
    return repo.find({ take: 5 });
  }

  @Get('complex-stats')
  @ApiOperation({ summary: 'Demo: 复杂统计查询' })
  async getComplexStats(@Request() req: any) {
    const tenantId = req.tenantSpace?.tenantId;
    if (!tenantId) {
      return { message: 'No tenant ID' };
    }
    const sql = `
      SELECT
        status,
        COUNT(*) as count,
        SUM(building_area) as total_area
      FROM units
      WHERE tenant_id = $1
      GROUP BY status
    `;
    return this.tenantDs.executeWithSchema(req, sql, [tenantId]);
  }

  @Public()
  @Get('space-resolve/:tenantId')
  @ApiOperation({ summary: 'Demo: 直接解析 Tenant Space (Public)' })
  async resolveSpace(@Param('tenantId') tenantId: string) {
    try {
      return await this.spaceRouter.resolve(tenantId);
    } catch (error: any) {
      return { error: error?.message || 'Unknown error' };
    }
  }
}
