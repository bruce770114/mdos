import { PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateBillDto } from './create-bill.dto';
import { BillStatus } from '../bill.entity';

export class UpdateBillDto extends PartialType(CreateBillDto) {}

export class UpdateBillStatusDto {
  @ApiPropertyOptional({
    enum: ['pending_review', 'reviewed', 'sent', 'paid', 'overdue'],
  })
  @IsEnum(['pending_review', 'reviewed', 'sent', 'paid', 'overdue'])
  status: BillStatus;
}
