import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseUUIDPipe,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { FinancialService } from './financial.service';
import { RegisterPaymentDto } from './dto/register-payment.dto';
import { QueryFinancialDto } from './dto/query-financial.dto';
import { CreateCollectionRecordDto } from './dto/create-collection-record.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PdfService } from '../common/services/pdf.service';

@ApiTags('finance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('finance')
export class FinancialController {
  constructor(
    private readonly financialService: FinancialService,
    private readonly pdfService: PdfService,
  ) {}

  // ─── Payments ─────────────────────────────────────────────────────────────

  @Post('payments')
  @ApiOperation({ summary: 'Register a payment against a receivable' })
  registerPayment(@Body() dto: RegisterPaymentDto, @Request() req: any) {
    return this.financialService.registerPayment(dto, req.user.tenantId, req.user.userId);
  }

  @Get('payments')
  @ApiOperation({ summary: 'List payments with filters' })
  getPayments(@Query() query: QueryFinancialDto, @Request() req: any) {
    return this.financialService.getPayments(query, req.user.tenantId);
  }

  // ─── Reports ──────────────────────────────────────────────────────────────

  @Get('receivables/summary')
  @ApiOperation({ summary: 'Get receivables summary (outstanding, overdue, paid totals)' })
  getReceivablesSummary(@Request() req: any) {
    return this.financialService.getReceivablesSummary(req.user.tenantId);
  }

  @Get('reports/income')
  @ApiOperation({ summary: 'Get income report grouped by month' })
  @ApiQuery({ name: 'year', required: true, type: Number })
  @ApiQuery({ name: 'month', required: false, type: Number })
  getIncomeReport(
    @Query() query: QueryFinancialDto,
    @Request() req: any,
  ) {
    const year = query.year ?? new Date().getFullYear();
    return this.financialService.getIncomeReport(req.user.tenantId, year, query.month);
  }

  @Get('reports/aging')
  @ApiOperation({ summary: 'Get aging receivables report (current, 1-30d, 31-60d, 61-90d, >90d)' })
  getAgingReport(@Request() req: any) {
    return this.financialService.getAgingReport(req.user.tenantId);
  }

  @Get('payments/by-receivable/:receivableId')
  @ApiOperation({ summary: 'Get all payments for a specific receivable' })
  getPaymentsByReceivable(
    @Param('receivableId', ParseUUIDPipe) receivableId: string,
    @Request() req: any,
  ) {
    return this.financialService.getPaymentsByReceivable(receivableId, req.user.tenantId);
  }

  // ─── Collection Records ───────────────────────────────────────────────────

  @Get('receivables/overdue-by-level')
  @ApiOperation({ summary: 'Get overdue receivables grouped by collection level (L1/L2/L3)' })
  getOverdueReceivablesByLevel(@Request() req: any) {
    return this.financialService.getOverdueReceivablesByLevel(req.user.tenantId);
  }

  @Get('collection-records')
  @ApiOperation({ summary: 'Get collection follow-up records' })
  getCollectionRecords(
    @Query('receivableId') receivableId: string,
    @Query('page') page: string,
    @Query('pageSize') pageSize: string,
    @Request() req: any,
  ) {
    return this.financialService.getCollectionRecords(
      req.user.tenantId,
      receivableId,
      parseInt(page ?? '1', 10),
      parseInt(pageSize ?? '20', 10),
    );
  }

  @Post('collection-records')
  @ApiOperation({ summary: 'Create a collection follow-up record' })
  createCollectionRecord(
    @Body() dto: CreateCollectionRecordDto,
    @Request() req: any,
  ) {
    return this.financialService.createCollectionRecord(dto, req.user.tenantId, req.user.id);
  }

  // ─── PDF Reports ──────────────────────────────────────────────────────────

  @Get('reports/income-pdf')
  @ApiOperation({ summary: 'Download income report as PDF' })
  async getIncomePdf(
    @Query('year') year: string,
    @Query('month') month: string,
    @Request() req: any,
    @Res() res: Response,
  ) {
    const y = parseInt(year ?? String(new Date().getFullYear()), 10);
    const m = month ? parseInt(month, 10) : undefined;
    const data = await this.financialService.getIncomeReport(req.user.tenantId, y, m);
    const buffer = await this.pdfService.generateIncomePdf(data, y, m);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="income-report-${y}${m ? '-' + m : ''}.pdf"`,
    });
    res.send(buffer);
  }

  @Get('reports/aging-pdf')
  @ApiOperation({ summary: 'Download aging receivables report as PDF' })
  async getAgingPdf(@Request() req: any, @Res() res: Response) {
    const data = await this.financialService.getAgingReport(req.user.tenantId);
    const buffer = await this.pdfService.generateAgingPdf(data);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="aging-report.pdf"`,
    });
    res.send(buffer);
  }
}
