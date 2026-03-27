import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from './entities/project.entity';
import { Building } from './entities/building.entity';
import { Floor } from './entities/floor.entity';
import { Unit } from './entities/unit.entity';
import { FloorPlanVersion } from './entities/floor-plan-version.entity';
import { UnitChangeRecord } from './entities/unit-change-record.entity';
import { UnitsService } from './units.service';
import { UnitsController } from './units.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Project, Building, Floor, Unit, FloorPlanVersion, UnitChangeRecord]),
  ],
  controllers: [UnitsController],
  providers: [UnitsService],
  exports: [UnitsService],
})
export class UnitsModule {}
