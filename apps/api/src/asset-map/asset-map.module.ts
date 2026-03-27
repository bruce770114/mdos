import { Module } from '@nestjs/common';
import { AssetMapService } from './asset-map.service';
import { AssetMapController } from './asset-map.controller';
import { UnitsModule } from '../units/units.module';
import { ContractsModule } from '../contracts/contracts.module';

@Module({
  imports: [UnitsModule, ContractsModule],
  controllers: [AssetMapController],
  providers: [AssetMapService],
})
export class AssetMapModule {}
