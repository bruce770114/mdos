import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsIn,
  Min,
  MaxLength,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { UnitType, UnitStatus, UnitPosition } from '../entities/unit.entity';

class UnitPositionDto implements UnitPosition {
  @IsNumber()
  x: number;

  @IsNumber()
  y: number;

  @IsNumber()
  @Min(0)
  width: number;

  @IsNumber()
  @Min(0)
  height: number;
}

export class CreateUnitDto {
  @ApiProperty({ description: 'Floor ID this unit belongs to' })
  @IsString()
  @IsNotEmpty()
  floorId: string;

  @ApiProperty({ description: 'Unit number / identifier' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  unitNo: string;

  @ApiProperty({ description: 'Total unit area in square meters' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  area: number;

  @ApiPropertyOptional({ description: 'Usable area in square meters' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  areaUsable?: number;

  @ApiPropertyOptional({ description: 'Common area in square meters' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  areaCommon?: number;

  @ApiPropertyOptional({
    enum: ['office', 'retail', 'warehouse', 'other'],
    default: 'office',
  })
  @IsOptional()
  @IsIn(['office', 'retail', 'warehouse', 'other'])
  unitType?: UnitType;

  @ApiPropertyOptional({
    enum: ['vacant', 'rented', 'reserved', 'renovating', 'maintenance'],
    default: 'vacant',
  })
  @IsOptional()
  @IsIn(['vacant', 'rented', 'reserved', 'renovating', 'maintenance'])
  status?: UnitStatus;

  @ApiPropertyOptional({
    description: 'Position on floor plan {x, y, width, height}',
    type: UnitPositionDto,
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => UnitPositionDto)
  position?: UnitPositionDto;
}
