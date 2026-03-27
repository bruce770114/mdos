import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ContractsService } from './contracts.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto, UpdateContractStatusDto, TerminateContractDto } from './dto/update-contract.dto';
import { QueryContractsDto } from './dto/query-contracts.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('contracts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('contracts')
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new contract' })
  create(@Body() dto: CreateContractDto, @Request() req: any) {
    return this.contractsService.create(dto, req.user.tenantId);
  }

  @Get()
  @ApiOperation({ summary: 'List contracts with pagination and filters' })
  findAll(@Query() query: QueryContractsDto, @Request() req: any) {
    return this.contractsService.findAll(query, req.user.tenantId);
  }

  @Get('expiring')
  @ApiOperation({ summary: 'Get contracts expiring within N days (30|60|90)' })
  @ApiQuery({ name: 'days', enum: [30, 60, 90], required: false })
  findExpiring(@Query('days') days: string, @Request() req: any) {
    const parsedDays = (parseInt(days, 10) || 30) as 30 | 60 | 90;
    return this.contractsService.findExpiring(parsedDays, req.user.tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a contract by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.contractsService.findOne(id, req.user.tenantId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a contract (only draft/pending_approval)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateContractDto,
    @Request() req: any,
  ) {
    return this.contractsService.update(id, dto, req.user.tenantId);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update contract status' })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateContractStatusDto,
    @Request() req: any,
  ) {
    return this.contractsService.updateStatus(id, dto.status, req.user.tenantId, req.user.id);
  }

  @Post(':id/terminate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Terminate an active contract' })
  terminate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TerminateContractDto,
    @Request() req: any,
  ) {
    return this.contractsService.terminate(id, dto, req.user.tenantId, req.user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a draft contract (soft delete)' })
  remove(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.contractsService.remove(id, req.user.tenantId);
  }
}
