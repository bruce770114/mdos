import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './payment.entity';
import { Receivable } from '../billing/receivable.entity';
import { CollectionRecord } from './entities/collection-record.entity';
import { FinancialService } from './financial.service';
import { FinancialController } from './financial.controller';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { PdfService } from '../common/services/pdf.service';

@Module({
  imports: [TypeOrmModule.forFeature([Payment, Receivable, CollectionRecord]), AuditLogModule],
  controllers: [FinancialController],
  providers: [FinancialService, PdfService],
  exports: [FinancialService],
})
export class FinancialModule {}
