import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import {
  PermissionsService,
  CreateRoleDto,
  UpdateRoleDto,
  SetRolePermissionsDto,
} from './permissions.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators';

@ApiTags('permissions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  // ─── Roles ───────────────────────────────────────────────────────────────

  @Get('roles')
  @ApiOperation({ summary: '获取角色列表' })
  async findAllRoles(@Request() req: any) {
    return this.permissionsService.findAllRoles(req.user.tenantId);
  }

  @Post('roles')
  @ApiOperation({ summary: '创建角色' })
  @Roles('admin', 'super_admin')
  async createRole(@Request() req: any, @Body() dto: CreateRoleDto) {
    return this.permissionsService.createRole(dto, req.user.tenantId);
  }

  @Put('roles/:id')
  @ApiOperation({ summary: '更新角色' })
  @Roles('admin', 'super_admin')
  async updateRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoleDto,
    @Request() req: any,
  ) {
    return this.permissionsService.updateRole(id, dto, req.user.tenantId);
  }

  @Delete('roles/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '删除角色' })
  @Roles('admin', 'super_admin')
  async deleteRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ) {
    await this.permissionsService.deleteRole(id, req.user.tenantId);
  }

  @Get('roles/:id/permissions')
  @ApiOperation({ summary: '获取角色权限列表' })
  async getRolePermissions(@Param('id', ParseUUIDPipe) id: string) {
    return this.permissionsService.getRolePermissions(id);
  }

  @Put('roles/:id/permissions')
  @ApiOperation({ summary: '设置角色权限' })
  @Roles('admin', 'super_admin')
  async setRolePermissions(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetRolePermissionsDto,
    @Request() req: any,
  ) {
    return this.permissionsService.setRolePermissions(
      id,
      dto.permissionIds,
      req.user.tenantId,
    );
  }

  // ─── Permissions ─────────────────────────────────────────────────────────

  @Get('permissions')
  @ApiOperation({ summary: '获取所有权限点列表' })
  async findAllPermissions() {
    return this.permissionsService.findAllPermissions();
  }
}
