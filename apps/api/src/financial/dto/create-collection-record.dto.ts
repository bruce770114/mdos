import { IsString, IsNotEmpty, IsIn, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCollectionRecordDto {
  @ApiProperty()
  @IsUUID()
  receivableId: string;

  @ApiProperty()
  @IsUUID()
  customerId: string;

  @ApiProperty({ enum: [1, 2, 3] })
  level: 1 | 2 | 3;

  @ApiProperty({ enum: ['system', 'phone', 'email', 'visit'] })
  @IsIn(['system', 'phone', 'email', 'visit'])
  method: 'system' | 'phone' | 'email' | 'visit';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
