import { IsString, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ManualMatchDto {
  @ApiProperty()
  @IsUUID()
  receivableId: string;
}
