import { PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateContractDto } from './create-contract.dto';
import { ContractStatus } from '../contract.entity';

export class UpdateContractDto extends PartialType(CreateContractDto) {
  @ApiPropertyOptional({
    enum: ['draft', 'pending_approval', 'active', 'expiring_soon', 'expired', 'terminated'],
  })
  @IsOptional()
  @IsEnum(['draft', 'pending_approval', 'active', 'expiring_soon', 'expired', 'terminated'])
  status?: ContractStatus;
}

export class UpdateContractStatusDto {
  @ApiPropertyOptional({
    enum: ['draft', 'pending_approval', 'active', 'expiring_soon', 'expired', 'terminated'],
  })
  @IsEnum(['draft', 'pending_approval', 'active', 'expiring_soon', 'expired', 'terminated'])
  status: ContractStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class TerminateContractDto {
  @ApiPropertyOptional()
  @IsString()
  reason: string;
}
