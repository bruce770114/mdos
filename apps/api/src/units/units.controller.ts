import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UnitsService } from './units.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { CreateBuildingDto } from './dto/create-building.dto';
import { CreateFloorDto } from './dto/create-floor.dto';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitStatusDto } from './dto/update-unit-status.dto';
import { QueryUnitsDto } from './dto/query-units.dto';

@ApiTags('Units')
@ApiBearerAuth()
@Controller()
export class UnitsController {
  constructor(private readonly unitsService: UnitsService) {}

  // ─── Projects ────────────────────────────────────────────────────────────────

  @Post('projects')
  @ApiOperation({ summary: 'Create a project' })
  @ApiResponse({ status: 201, description: 'Project created' })
  createProject(@Body() dto: CreateProjectDto, @Request() req: any) {
    return this.unitsService.createProject(dto, req.user.tenantId);
  }

  @Get('projects')
  @ApiOperation({ summary: 'List all projects for tenant' })
  findAllProjects(@Request() req: any) {
    return this.unitsService.findAllProjects(req.user.tenantId);
  }

  @Get('projects/:id')
  @ApiOperation({ summary: 'Get a project with buildings' })
  findOneProject(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ) {
    return this.unitsService.findOneProject(id, req.user.tenantId);
  }

  @Put('projects/:id')
  @ApiOperation({ summary: 'Update a project' })
  updateProject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateProjectDto,
    @Request() req: any,
  ) {
    return this.unitsService.updateProject(id, dto, req.user.tenantId);
  }

  @Delete('projects/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a project' })
  removeProject(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ) {
    return this.unitsService.removeProject(id, req.user.tenantId);
  }

  // ─── Buildings ────────────────────────────────────────────────────────────────

  @Post('buildings')
  @ApiOperation({ summary: 'Create a building' })
  createBuilding(@Body() dto: CreateBuildingDto, @Request() req: any) {
    return this.unitsService.createBuilding(dto, req.user.tenantId);
  }

  @Get('projects/:projectId/buildings')
  @ApiOperation({ summary: 'List buildings for a project' })
  findBuildingsByProject(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Request() req: any,
  ) {
    return this.unitsService.findBuildingsByProject(projectId, req.user.tenantId);
  }

  @Get('buildings/:id')
  @ApiOperation({ summary: 'Get a building with floors' })
  findOneBuilding(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ) {
    return this.unitsService.findOneBuilding(id, req.user.tenantId);
  }

  @Put('buildings/:id')
  @ApiOperation({ summary: 'Update a building' })
  updateBuilding(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateBuildingDto,
    @Request() req: any,
  ) {
    return this.unitsService.updateBuilding(id, dto, req.user.tenantId);
  }

  @Delete('buildings/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a building' })
  removeBuilding(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ) {
    return this.unitsService.removeBuilding(id, req.user.tenantId);
  }

  // ─── Floors ───────────────────────────────────────────────────────────────────

  @Post('floors')
  @ApiOperation({ summary: 'Create a floor' })
  createFloor(@Body() dto: CreateFloorDto, @Request() req: any) {
    return this.unitsService.createFloor(dto, req.user.tenantId);
  }

  @Get('buildings/:buildingId/floors')
  @ApiOperation({ summary: 'List floors for a building' })
  findFloorsByBuilding(
    @Param('buildingId', ParseUUIDPipe) buildingId: string,
    @Request() req: any,
  ) {
    return this.unitsService.findFloorsByBuilding(buildingId, req.user.tenantId);
  }

  @Get('floors/:id')
  @ApiOperation({ summary: 'Get a floor with units' })
  findOneFloor(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ) {
    return this.unitsService.findOneFloor(id, req.user.tenantId);
  }

  @Put('floors/:id')
  @ApiOperation({ summary: 'Update a floor' })
  updateFloor(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateFloorDto,
    @Request() req: any,
  ) {
    return this.unitsService.updateFloor(id, dto, req.user.tenantId);
  }

  @Delete('floors/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a floor' })
  removeFloor(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ) {
    return this.unitsService.removeFloor(id, req.user.tenantId);
  }

  // ─── Units ────────────────────────────────────────────────────────────────────

  @Get('units/statistics')
  @ApiOperation({ summary: 'Get unit occupancy statistics for tenant' })
  getStatistics(@Request() req: any) {
    return this.unitsService.getStatistics(req.user.tenantId);
  }

  @Post('units')
  @ApiOperation({ summary: 'Create a unit' })
  createUnit(@Body() dto: CreateUnitDto, @Request() req: any) {
    return this.unitsService.createUnit(dto, req.user.tenantId);
  }

  @Get('units')
  @ApiOperation({ summary: 'List units with filters and pagination' })
  findUnits(@Query() query: QueryUnitsDto, @Request() req: any) {
    return this.unitsService.findUnits(query, req.user.tenantId);
  }

  @Get('units/:id')
  @ApiOperation({ summary: 'Get a single unit' })
  findOneUnit(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ) {
    return this.unitsService.findOneUnit(id, req.user.tenantId);
  }

  @Put('units/:id')
  @ApiOperation({ summary: 'Update a unit' })
  updateUnit(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateUnitDto,
    @Request() req: any,
  ) {
    return this.unitsService.updateUnit(id, dto, req.user.tenantId);
  }

  @Patch('units/:id/status')
  @ApiOperation({ summary: 'Update unit status' })
  updateUnitStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUnitStatusDto,
    @Request() req: any,
  ) {
    return this.unitsService.updateUnitStatus(
      id,
      dto.status,
      req.user.tenantId,
      req.user.id,
    );
  }

  @Delete('units/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a unit' })
  removeUnit(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ) {
    return this.unitsService.removeUnit(id, req.user.tenantId);
  }

  // ─── Merge / Split / Versions / Change Records ────────────────────────────────

  @Post('units/merge')
  @ApiOperation({ summary: 'Merge multiple vacant units into one' })
  mergeUnits(
    @Body() body: { unitIds: string[]; newUnitNo: string },
    @Request() req: any,
  ) {
    return this.unitsService.mergeUnits(body.unitIds, body.newUnitNo, req.user.id, req.user.tenantId);
  }

  @Post('units/:id/split')
  @ApiOperation({ summary: 'Split a vacant unit into multiple sub-units' })
  splitUnit(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { parts: Array<{ unitNo: string; area: number }> },
    @Request() req: any,
  ) {
    return this.unitsService.splitUnit(id, body.parts, req.user.id, req.user.tenantId);
  }

  @Get('floors/:id/versions')
  @ApiOperation({ summary: 'Get floor plan version history' })
  getFloorVersions(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ) {
    return this.unitsService.getFloorVersions(id, req.user.tenantId);
  }

  @Get('floors/versions/compare')
  @ApiOperation({ summary: 'Compare two floor plan versions' })
  compareVersions(
    @Query('v1') v1: string,
    @Query('v2') v2: string,
    @Request() req: any,
  ) {
    return this.unitsService.compareVersions(v1, v2, req.user.tenantId);
  }

  @Get('units/change-records')
  @ApiOperation({ summary: 'Get unit change record log' })
  getChangeRecords(
    @Query('floorId') floorId: string,
    @Query('page') page: string,
    @Query('pageSize') pageSize: string,
    @Request() req: any,
  ) {
    return this.unitsService.getChangeRecords(
      req.user.tenantId,
      floorId,
      parseInt(page ?? '1', 10),
      parseInt(pageSize ?? '20', 10),
    );
  }
}
