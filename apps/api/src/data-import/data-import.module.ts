import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { Project } from '../units/entities/project.entity';
import { Building } from '../units/entities/building.entity';
import { Floor } from '../units/entities/floor.entity';
import { Unit } from '../units/entities/unit.entity';
import { Customer } from '../customers/customer.entity';
import { Contract } from '../contracts/contract.entity';
import { DataImportService } from './data-import.service';
import { DataImportController } from './data-import.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Project, Building, Floor, Unit, Customer, Contract]),
    MulterModule.register({ limits: { fileSize: 10 * 1024 * 1024 } }),
  ],
  controllers: [DataImportController],
  providers: [DataImportService],
})
export class DataImportModule {}
