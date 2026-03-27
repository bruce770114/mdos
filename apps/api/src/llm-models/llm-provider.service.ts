import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LlmProvider } from './entities/llm-provider.entity';
import { CreateLlmProviderDto, UpdateLlmProviderDto } from './dto';

@Injectable()
export class LlmProviderService {
  constructor(
    @InjectRepository(LlmProvider)
    private readonly llmProviderRepo: Repository<LlmProvider>,
  ) {}

  async create(tenantId: string, dto: CreateLlmProviderDto): Promise<LlmProvider> {
    // 检查同一租户内name不重复
    const existing = await this.llmProviderRepo.findOne({
      where: { tenantId, name: dto.name },
    });

    if (existing) {
      throw new BadRequestException(`Provider name "${dto.name}" already exists for this tenant`);
    }

    const provider = this.llmProviderRepo.create({
      ...dto,
      tenantId,
    });

    return this.llmProviderRepo.save(provider);
  }

  async findAllByTenant(tenantId: string): Promise<LlmProvider[]> {
    return this.llmProviderRepo.find({
      where: { tenantId },
      order: { priority: 'ASC', createdAt: 'DESC' },
    });
  }

  async findById(tenantId: string, providerId: string): Promise<LlmProvider> {
    const provider = await this.llmProviderRepo.findOne({
      where: { id: providerId, tenantId },
    });

    if (!provider) {
      throw new NotFoundException(`LLM Provider not found`);
    }

    return provider;
  }

  async update(tenantId: string, providerId: string, dto: UpdateLlmProviderDto): Promise<LlmProvider> {
    const provider = await this.findById(tenantId, providerId);

    // 如果更改名称，检查不重复
    if (dto.name && dto.name !== provider.name) {
      const existing = await this.llmProviderRepo.findOne({
        where: { tenantId, name: dto.name },
      });
      if (existing) {
        throw new BadRequestException(`Provider name "${dto.name}" already exists`);
      }
    }

    Object.assign(provider, dto);
    return this.llmProviderRepo.save(provider);
  }

  async delete(tenantId: string, providerId: string): Promise<void> {
    const provider = await this.findById(tenantId, providerId);
    await this.llmProviderRepo.remove(provider);
  }

  /**
   * 获取租户的所有启用的供应商
   */
  async findEnabledByTenant(tenantId: string): Promise<LlmProvider[]> {
    return this.llmProviderRepo.find({
      where: { tenantId, enabled: true },
      order: { priority: 'ASC' },
    });
  }
}
