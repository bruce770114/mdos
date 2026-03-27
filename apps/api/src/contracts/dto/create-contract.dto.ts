import {
  IsString,
  IsDateString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BillingType } from '../contract.entity';

export class CreateRentRuleDto {
  @ApiProperty()
  @IsString()
  ruleType: string;

  @ApiProperty()
  params: Record<string, unknown>;

  @ApiProperty()
  @IsDateString()
  effectiveFrom: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  effectiveTo?: string;
}

export class CreateContractDto {
  @ApiProperty()
  @IsString()
  customerId: string;

  @ApiProperty()
  @IsString()
  unitId: string;

  @ApiProperty()
  @IsDateString()
  startDate: string;

  @ApiProperty()
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  rentFreeDays?: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  baseRent: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  propertyFee?: number;

  @ApiPropertyOptional({ enum: ['fixed', 'stepped', 'guarantee_plus_share', 'pure_share'], default: 'fixed' })
  @IsOptional()
  @IsEnum(['fixed', 'stepped', 'guarantee_plus_share', 'pure_share'])
  billingType?: BillingType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  signedDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ type: [CreateRentRuleDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRentRuleDto)
  rules?: CreateRentRuleDto[];
}
