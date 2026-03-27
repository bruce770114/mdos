import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LlmModel, AiTaskType } from './entities/llm-model.entity';
import { LlmProvider } from './entities/llm-provider.entity';
import { CreateLlmModelDto, UpdateLlmModelDto } from './dto';
import { LlmProviderService } from './llm-provider.service';

@Injectable()
export class LlmModelService {
  constructor(
    @InjectRepository(LlmModel)
    private readonly llmModelRepo: Repository<LlmModel>,
    @InjectRepository(LlmProvider)
    private readonly llmProviderRepo: Repository<LlmProvider>,
    private readonly llmProviderService: LlmProviderService,
  ) {}

  async create(tenantId: string, dto: CreateLlmModelDto): Promise<LlmModel> {
    // 验证provider存在
    const provider = await this.llmProviderService.findById(tenantId, dto.llmProviderId);

    // 如果设为默认，则清除同aiTaskType的其他默认
    if (dto.isDefault) {
      await this.llmModelRepo.update(
        {
          tenantId,
          aiTaskType: dto.aiTaskType,
          isDefault: true,
        },
        { isDefault: false },
      );
    }

    const model = this.llmModelRepo.create({
      ...dto,
      tenantId,
    });

    return this.llmModelRepo.save(model);
  }

  async findAllByTenant(tenantId: string): Promise<LlmModel[]> {
    return this.llmModelRepo.find({
      where: { tenantId },
      relations: ['provider'],
      order: { aiTaskType: 'ASC', priority: 'ASC', createdAt: 'DESC' },
    });
  }

  async findByTaskType(tenantId: string, taskType: AiTaskType): Promise<LlmModel[]> {
    return this.llmModelRepo.find({
      where: {
        tenantId,
        aiTaskType: taskType,
        enabled: true,
      },
      relations: ['provider'],
      order: { isDefault: 'DESC', priority: 'ASC' },
    });
  }

  /**
   * 获取指定任务类型的默认模型
   */
  async getDefaultModelForTask(tenantId: string, taskType: AiTaskType): Promise<LlmModel> {
    let model = await this.llmModelRepo.findOne({
      where: {
        tenantId,
        aiTaskType: taskType,
        isDefault: true,
        enabled: true,
      },
      relations: ['provider'],
    });

    // 如果没有默认模型，获取优先级最高的启用模型
    if (!model) {
      model = await this.llmModelRepo.findOne({
        where: {
          tenantId,
          aiTaskType: taskType,
          enabled: true,
        },
        relations: ['provider'],
        order: { priority: 'ASC' },
      });
    }

    if (!model) {
      throw new NotFoundException(`No LLM model configured for task type: ${taskType}`);
    }

    return model;
  }

  async findById(tenantId: string, modelId: string): Promise<LlmModel> {
    const model = await this.llmModelRepo.findOne({
      where: { id: modelId, tenantId },
      relations: ['provider'],
    });

    if (!model) {
      throw new NotFoundException(`LLM Model not found`);
    }

    return model;
  }

  async update(tenantId: string, modelId: string, dto: UpdateLlmModelDto): Promise<LlmModel> {
    const model = await this.findById(tenantId, modelId);

    // 验证provider如果有改动
    if (dto.llmProviderId && dto.llmProviderId !== model.llmProviderId) {
      await this.llmProviderService.findById(tenantId, dto.llmProviderId);
    }

    // 如果设为默认，则清除同aiTaskType的其他默认
    if (dto.isDefault === true && !model.isDefault) {
      const taskType = dto.aiTaskType || model.aiTaskType;
      await this.llmModelRepo.update(
        {
          tenantId,
          aiTaskType: taskType,
          isDefault: true,
          id: `<> '${modelId}'`, // 排除当前模型
        },
        { isDefault: false },
      );
    }

    Object.assign(model, dto);
    return this.llmModelRepo.save(model);
  }

  async delete(tenantId: string, modelId: string): Promise<void> {
    const model = await this.findById(tenantId, modelId);
    await this.llmModelRepo.remove(model);
  }

  /**
   * 获取租户所有任务类型的默认模型映射
   */
  async getDefaultModelsMap(tenantId: string): Promise<Record<AiTaskType, LlmModel>> {
    const models = await this.llmModelRepo.find({
      where: {
        tenantId,
        isDefault: true,
        enabled: true,
      },
      relations: ['provider'],
    });

    const map: Record<AiTaskType, LlmModel> = {} as any;
    for (const model of models) {
      map[model.aiTaskType] = model;
    }

    return map;
  }

  /**
   * 获取租户某个Provider下的所有模型
   */
  async findByProvider(tenantId: string, providerId: string): Promise<LlmModel[]> {
    return this.llmModelRepo.find({
      where: { tenantId, llmProviderId: providerId },
      relations: ['provider'],
      order: { aiTaskType: 'ASC', priority: 'ASC' },
    });
  }
}
