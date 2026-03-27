import {
  Controller,
  Get,
  Param,
  UseGuards,
  Request,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AssetMapService } from './asset-map.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('asset-map')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('asset-map')
export class AssetMapController {
  constructor(private readonly assetMapService: AssetMapService) {}

  @Get('projects')
  @ApiOperation({ summary: 'Get all projects with geo coordinates and unit stats' })
  getProjects(@Request() req: any) {
    return this.assetMapService.getProjects(req.user.tenantId);
  }

  @Get('projects/:id/buildings')
  @ApiOperation({ summary: 'Get buildings and floors for a project with unit counts per floor' })
  getProjectBuildings(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ) {
    return this.assetMapService.getProjectBuildings(id, req.user.tenantId);
  }

  @Get('floors/:id/units')
  @ApiOperation({ summary: 'Get units on a floor with status and current contract customer' })
  getFloorUnits(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ) {
    return this.assetMapService.getFloorUnits(id, req.user.tenantId);
  }
}
