import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsInt,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateFloorDto {
  @ApiProperty({ description: 'Building ID this floor belongs to' })
  @IsString()
  @IsNotEmpty()
  buildingId: string;

  @ApiProperty({ description: 'Floor number (negative for basement)' })
  @Type(() => Number)
  @IsInt()
  floorNo: number;

  @ApiProperty({ description: 'Floor display name, e.g. "1F", "B1"' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  floorName: string;

  @ApiPropertyOptional({ description: 'Total floor area in square meters' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  totalArea?: number;

  @ApiPropertyOptional({ description: 'URL to floor plan image' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  floorPlanUrl?: string;
}
