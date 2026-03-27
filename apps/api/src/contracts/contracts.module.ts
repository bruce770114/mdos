import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Contract } from './contract.entity';
import { ContractRentRule } from './contract-rent-rule.entity';
import { ContractsService } from './contracts.service';
import { ContractsController } from './contracts.controller';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [TypeOrmModule.forFeature([Contract, ContractRentRule]), AuditLogModule],
  controllers: [ContractsController],
  providers: [ContractsService],
  exports: [ContractsService, TypeOrmModule],
})
export class ContractsModule {}
