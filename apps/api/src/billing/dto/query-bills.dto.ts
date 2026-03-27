import { IsOptional, IsEnum, IsString, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { BillStatus } from '../bill.entity';
import { ReceivableStatus } from '../receivable.entity';

export class QueryBillsDto extends PaginationDto {
  @ApiPropertyOptional({ enum: ['pending_review', 'reviewed', 'sent', 'paid', 'overdue'] })
  @IsOptional()
  @IsEnum(['pending_review', 'reviewed', 'sent', 'paid', 'overdue'])
  status?: BillStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contractId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  periodStart?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  periodEnd?: string;
}

export class QueryReceivablesDto extends PaginationDto {
  @ApiPropertyOptional({ enum: ['outstanding', 'partial', 'paid', 'overdue'] })
  @IsOptional()
  @IsEnum(['outstanding', 'partial', 'paid', 'overdue'])
  status?: ReceivableStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contractId?: string;
}
