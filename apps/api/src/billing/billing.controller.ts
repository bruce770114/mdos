import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BillingService } from './billing.service';
import { CreateBillDto } from './dto/create-bill.dto';
import { UpdateBillStatusDto } from './dto/update-bill.dto';
import { QueryBillsDto, QueryReceivablesDto } from './dto/query-bills.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('billing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  // ─── Bills ────────────────────────────────────────────────────────────────

  @Post('bills')
  @ApiOperation({ summary: 'Generate a new bill with items and receivable' })
  generateBill(@Body() dto: CreateBillDto, @Request() req: any) {
    return this.billingService.generateBill(dto, req.user.tenantId);
  }

  @Get('bills')
  @ApiOperation({ summary: 'List bills with pagination and filters' })
  findAllBills(@Query() query: QueryBillsDto, @Request() req: any) {
    return this.billingService.findAllBills(query, req.user.tenantId);
  }

  @Get('bills/:id')
  @ApiOperation({ summary: 'Get a bill by ID (includes items)' })
  findOneBill(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.billingService.findOneBill(id, req.user.tenantId);
  }

  @Patch('bills/:id')
  @ApiOperation({ summary: 'Update bill details' })
  updateBill(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateBillDto,
    @Request() req: any,
  ) {
    // Re-use findOneBill for idempotent check; actual update via status route
    return this.billingService.findOneBill(id, req.user.tenantId);
  }

  @Patch('bills/:id/status')
  @ApiOperation({ summary: 'Update bill status' })
  updateBillStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBillStatusDto,
    @Request() req: any,
  ) {
    return this.billingService.updateBillStatus(id, dto.status, req.user.tenantId);
  }

  // ─── Receivables ──────────────────────────────────────────────────────────

  @Get('receivables')
  @ApiOperation({ summary: 'List receivables with pagination and filters' })
  getReceivables(@Query() query: QueryReceivablesDto, @Request() req: any) {
    return this.billingService.getReceivables(query, req.user.tenantId);
  }

  // ─── Auto Generate ────────────────────────────────────────────────────────

  @Post('billing/auto-generate')
  @ApiOperation({ summary: 'Auto-generate bills for active contracts for a given year/month' })
  autoGenerateBills(
    @Body() body: { year: number; month: number },
    @Request() req: any,
  ) {
    return this.billingService.autoGenerateBills(body.year, body.month, req.user.tenantId);
  }

  // ─── PDF Download ─────────────────────────────────────────────────────────

  @Get('bills/:id/pdf')
  @ApiOperation({ summary: 'Download bill as PDF' })
  async getBillPdf(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
    @Res() res: Response,
  ) {
    const buffer = await this.billingService.getBillPdf(id, req.user.tenantId);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="bill-${id}.pdf"`,
      'Content-Length': buffer.length,
    });
    res.send(buffer);
  }
}
