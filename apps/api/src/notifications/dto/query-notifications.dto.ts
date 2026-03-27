import { IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { NotificationType } from '../notification.entity';

export class QueryNotificationsDto extends PaginationDto {
  @ApiPropertyOptional({
    enum: ['contract_reminder', 'bill_overdue', 'bill_review', 'contract_approval', 'system'],
  })
  @IsOptional()
  @IsEnum(['contract_reminder', 'bill_overdue', 'bill_review', 'contract_approval', 'system'])
  type?: NotificationType;

  @ApiPropertyOptional({ description: 'Filter by read status (true/false)' })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  isRead?: boolean;
}
