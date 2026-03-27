import {
  IsString,
  IsDateString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
  Min,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BillItemType } from '../bill-item.entity';

export class CreateBillItemDto {
  @ApiProperty({ enum: ['rent', 'property_fee', 'utility', 'other'] })
  @IsEnum(['rent', 'property_fee', 'utility', 'other'])
  itemType: BillItemType;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  unitPrice: number;
}

export class CreateBillDto {
  @ApiProperty()
  @IsString()
  contractId: string;

  @ApiProperty()
  @IsString()
  customerId: string;

  @ApiProperty()
  @IsString()
  unitId: string;

  @ApiProperty()
  @IsDateString()
  periodStart: string;

  @ApiProperty()
  @IsDateString()
  periodEnd: string;

  @ApiProperty()
  @IsDateString()
  dueDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [CreateBillItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateBillItemDto)
  items: CreateBillItemDto[];
}
