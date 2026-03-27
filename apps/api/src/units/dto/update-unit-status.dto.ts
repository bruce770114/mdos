import { IsIn, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UnitStatus } from '../entities/unit.entity';

export class UpdateUnitStatusDto {
  @ApiProperty({
    enum: ['vacant', 'rented', 'reserved', 'renovating', 'maintenance'],
    description: 'New status for the unit',
  })
  @IsNotEmpty()
  @IsIn(['vacant', 'rented', 'reserved', 'renovating', 'maintenance'])
  status: UnitStatus;
}
