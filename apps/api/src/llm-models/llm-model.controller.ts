import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { LlmModelService } from './llm-model.service';
import { CreateLlmModelDto, UpdateLlmModelDto } from './dto';
import { AiTaskType } from './entities/llm-model.entity';
import { CurrentTenantId } from '../common/decorators';

@ApiTags('LLM Models')
@Controller('llm-models')
export class LlmModelController {
  constructor(private readonly llmModelService: LlmModelService) {}

  @Post()
  @ApiOperation({ summary: 'Create LLM Model' })
  create(@CurrentTenantId() tenantId: string, @Body() dto: CreateLlmModelDto) {
    return this.llmModelService.create(tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all LLM Models' })
  findAll(@CurrentTenantId() tenantId: string) {
    return this.llmModelService.findAllByTenant(tenantId);
  }

  @Get('task/:taskType')
  @ApiOperation({ summary: 'List models for specific task type' })
  findByTaskType(@CurrentTenantId() tenantId: string, @Param('taskType') taskType: AiTaskType) {
    return this.llmModelService.findByTaskType(tenantId, taskType);
  }

  @Get('default-mapping')
  @ApiOperation({ summary: 'Get default model mapping for all tasks' })
  getDefaultModelsMap(@CurrentTenantId() tenantId: string) {
    return this.llmModelService.getDefaultModelsMap(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get LLM Model by ID' })
  findOne(@CurrentTenantId() tenantId: string, @Param('id') id: string) {
    return this.llmModelService.findById(tenantId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update LLM Model' })
  update(@CurrentTenantId() tenantId: string, @Param('id') id: string, @Body() dto: UpdateLlmModelDto) {
    return this.llmModelService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete LLM Model' })
  delete(@CurrentTenantId() tenantId: string, @Param('id') id: string) {
    return this.llmModelService.delete(tenantId, id);
  }
}
