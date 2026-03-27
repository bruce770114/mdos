import { Controller, Get, Post, Put, Delete, Body, Param, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { LlmProviderService } from './llm-provider.service';
import { CreateLlmProviderDto, UpdateLlmProviderDto } from './dto';
import { CurrentTenantId } from '../common/decorators';

@ApiTags('LLM Providers')
@Controller('llm-providers')
export class LlmProviderController {
  constructor(private readonly llmProviderService: LlmProviderService) {}

  @Post()
  @ApiOperation({ summary: 'Create LLM Provider' })
  create(@CurrentTenantId() tenantId: string, @Body() dto: CreateLlmProviderDto) {
    return this.llmProviderService.create(tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all LLM Providers' })
  findAll(@CurrentTenantId() tenantId: string) {
    return this.llmProviderService.findAllByTenant(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get LLM Provider by ID' })
  findOne(@CurrentTenantId() tenantId: string, @Param('id') id: string) {
    return this.llmProviderService.findById(tenantId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update LLM Provider' })
  update(@CurrentTenantId() tenantId: string, @Param('id') id: string, @Body() dto: UpdateLlmProviderDto) {
    return this.llmProviderService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete LLM Provider' })
  delete(@CurrentTenantId() tenantId: string, @Param('id') id: string) {
    return this.llmProviderService.delete(tenantId, id);
  }
}
