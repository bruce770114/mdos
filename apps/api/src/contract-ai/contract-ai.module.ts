import { Module } from '@nestjs/common';
import { ContractAiService } from './contract-ai.service';
import { ContractAiController } from './contract-ai.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Contract } from '../contracts/contract.entity';
import { LlmModelsModule } from '../llm-models/llm-models.module';

@Module({
  imports: [TypeOrmModule.forFeature([Contract]), LlmModelsModule],
  controllers: [ContractAiController],
  providers: [ContractAiService],
})
export class ContractAiModule {}
