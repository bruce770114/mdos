import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LlmProvider } from './entities/llm-provider.entity';
import { LlmModel } from './entities/llm-model.entity';
import { LlmProviderService } from './llm-provider.service';
import { LlmModelService } from './llm-model.service';
import { LlmProviderController } from './llm-provider.controller';
import { LlmModelController } from './llm-model.controller';

@Module({
  imports: [TypeOrmModule.forFeature([LlmProvider, LlmModel])],
  providers: [LlmProviderService, LlmModelService],
  controllers: [LlmProviderController, LlmModelController],
  exports: [LlmProviderService, LlmModelService], // 导出供其他模块使用
})
export class LlmModelsModule {}
