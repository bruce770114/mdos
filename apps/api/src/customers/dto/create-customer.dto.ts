import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsEmail,
  IsIn,
  IsArray,
  Min,
  MaxLength,
  IsPhoneNumber,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { CustomerGrade } from '../customer.entity';

export class CreateCustomerDto {
  @ApiProperty({ description: 'Company name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  companyName: string;

  @ApiPropertyOptional({ description: 'Unified social credit code' })
  @IsOptional()
  @IsString()
  @MaxLength(18)
  creditCode?: string;

  @ApiPropertyOptional({ description: 'Legal representative name' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  legalPerson?: string;

  @ApiPropertyOptional({ description: 'Registered capital (in 10,000 CNY)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  registeredCapital?: number;

  @ApiProperty({ description: 'Primary contact person name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  contactName: string;

  @ApiProperty({ description: 'Primary contact phone number' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  phone: string;

  @ApiPropertyOptional({ description: 'Primary contact email' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Company address' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @ApiPropertyOptional({ description: 'Industry type' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  industry?: string;

  @ApiPropertyOptional({ enum: ['A', 'B', 'C'], description: 'Customer grade' })
  @IsOptional()
  @IsIn(['A', 'B', 'C'])
  grade?: CustomerGrade;

  @ApiPropertyOptional({ description: 'Tags for customer categorisation', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Internal notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
