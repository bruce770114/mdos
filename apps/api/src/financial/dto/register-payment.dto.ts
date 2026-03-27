import {
  IsString,
  IsNumber,
  IsDateString,
  IsOptional,
  IsEnum,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '../payment.entity';

export class RegisterPaymentDto {
  @ApiProperty()
  @IsString()
  receivableId: string;

  @ApiProperty()
  @IsString()
  customerId: string;

  @ApiProperty()
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty()
  @IsDateString()
  paymentDate: string;

  @ApiPropertyOptional({ enum: ['bank_transfer', 'cash', 'check', 'other'], default: 'bank_transfer' })
  @IsOptional()
  @IsEnum(['bank_transfer', 'cash', 'check', 'other'])
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
