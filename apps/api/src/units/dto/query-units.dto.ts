import { IsOptional, IsString, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { UnitStatus } from '../entities/unit.entity';

export class QueryUnitsDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Search by unit number' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: ['vacant', 'rented', 'reserved', 'renovating', 'maintenance'],
    description: 'Filter by unit status',
  })
  @IsOptional()
  @IsIn(['vacant', 'rented', 'reserved', 'renovating', 'maintenance'])
  status?: UnitStatus;

  @ApiPropertyOptional({ description: 'Filter by floor ID' })
  @IsOptional()
  @IsString()
  floorId?: string;

  @ApiPropertyOptional({ description: 'Filter by building ID' })
  @IsOptional()
  @IsString()
  buildingId?: string;

  @ApiPropertyOptional({ description: 'Filter by project ID' })
  @IsOptional()
  @IsString()
  projectId?: string;
}
