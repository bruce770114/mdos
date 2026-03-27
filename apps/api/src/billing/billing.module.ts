import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Bill } from './bill.entity';
import { BillItem } from './bill-item.entity';
import { Receivable } from './receivable.entity';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { Contract } from '../contracts/contract.entity';
import { EmailService } from '../common/services/email.service';
import { PdfService } from '../common/services/pdf.service';

@Module({
  imports: [TypeOrmModule.forFeature([Bill, BillItem, Receivable, Contract])],
  controllers: [BillingController],
  providers: [BillingService, EmailService, PdfService],
  exports: [BillingService, TypeOrmModule],
})
export class BillingModule {}

