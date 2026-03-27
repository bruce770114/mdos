import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UsersService, CreateUserDto, UpdateUserDto, UpdateRolesDto } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: '获取用户列表（分页）' })
  @ApiQuery({ name: 'search', required: false })
  async findAll(
    @Request() req: any,
    @Query() pagination: PaginationDto,
    @Query('search') search?: string,
  ) {
    return this.usersService.findAll(req.user.tenantId, pagination, search);
  }

  @Post()
  @ApiOperation({ summary: '创建用户' })
  @Roles('admin', 'super_admin')
  async create(@Request() req: any, @Body() dto: CreateUserDto) {
    return this.usersService.create(dto, req.user.tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取单个用户' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ) {
    return this.usersService.findOne(id, req.user.tenantId);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新用户' })
  @Roles('admin', 'super_admin')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @Request() req: any,
  ) {
    return this.usersService.update(id, dto, req.user.tenantId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '删除用户（软删除）' })
  @Roles('admin', 'super_admin')
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ) {
    await this.usersService.remove(id, req.user.tenantId);
  }

  @Put(':id/roles')
  @ApiOperation({ summary: '更新用户角色' })
  @Roles('admin', 'super_admin')
  async updateRoles(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRolesDto,
    @Request() req: any,
  ) {
    return this.usersService.updateRoles(id, dto.roleIds, req.user.tenantId);
  }

  @Put(':id/language')
  @ApiOperation({ summary: '更新用户界面语言偏好' })
  @HttpCode(HttpStatus.OK)
  async updateLanguage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: { language: string },
    @Request() req: any,
  ) {
    return this.usersService.updateLanguage(id, req.user.tenantId, dto.language);
  }
}
