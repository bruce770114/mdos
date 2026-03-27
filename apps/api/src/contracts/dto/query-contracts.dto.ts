import { IsOptional, IsEnum, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { ContractStatus } from '../contract.entity';

export class QueryContractsDto extends PaginationDto {
  @ApiPropertyOptional({
    enum: ['draft', 'pending_approval', 'active', 'expiring_soon', 'expired', 'terminated'],
  })
  @IsOptional()
  @IsEnum(['draft', 'pending_approval', 'active', 'expiring_soon', 'expired', 'terminated'])
  status?: ContractStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  unitId?: string;

  @ApiPropertyOptional({ description: 'Find contracts expiring within N days', enum: [30, 60, 90] })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  expiringDays?: number;

  @ApiPropertyOptional({ description: 'Search by contract number or customer name' })
  @IsOptional()
  @IsString()
  search?: string;
}
