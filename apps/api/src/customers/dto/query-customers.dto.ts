import { IsOptional, IsString, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { CustomerGrade } from '../customer.entity';

export class QueryCustomersDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Search by company name, contact name or phone',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: ['A', 'B', 'C'],
    description: 'Filter by customer grade',
  })
  @IsOptional()
  @IsIn(['A', 'B', 'C'])
  grade?: CustomerGrade;

  @ApiPropertyOptional({ description: 'Filter by industry' })
  @IsOptional()
  @IsString()
  industry?: string;
}
