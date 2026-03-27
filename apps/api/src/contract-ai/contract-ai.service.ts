import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contract } from '../contracts/contract.entity';
import { LlmModelService, AiTaskType, LlmModel } from '../llm-models';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

export interface ParsedContractResult {
  partyA?: string;
  partyB?: string;
  startDate?: string;
  endDate?: string;
  baseRent?: number;
  propertyFee?: number;
  billingType?: string;
  rentFreeDays?: number;
  guaranteeAmount?: number;
  revenueShareRate?: number;
  notes?: string;
  raw?: string;
  usedModel?: string; // 追踪实际使用的模型
}

@Injectable()
export class ContractAiService {
  private readonly logger = new Logger(ContractAiService.name);

  constructor(
    @InjectRepository(Contract)
    private readonly contractRepo: Repository<Contract>,
    private readonly llmModelService: LlmModelService,
  ) {}

  /**
   * 获取系统提示词
   */
  private getSystemPrompt(): string {
    return `你是一个专业的不动产合同分析助手。
从用户提供的合同文本中提取关键信息，以 JSON 格式返回，字段如下：
- partyA: 甲方（出租方）名称
- partyB: 乙方（承租方）名称
- startDate: 起租日期 (YYYY-MM-DD)
- endDate: 到期日期 (YYYY-MM-DD)
- baseRent: 基础租金（数字，元/月）
- propertyFee: 物业费（数字，元/月）
- billingType: 计租类型（fixed/stepped/guarantee_plus_share/pure_share）
- rentFreeDays: 免租天数（数字）
- guaranteeAmount: 保底金额（数字，guarantee_plus_share/pure_share 时适用）
- revenueShareRate: 抽成比例（0-100 的数字，百分比）
- notes: 其他重要备注

如果某字段无法从文本中提取，则设为 null。
只返回 JSON，不要包含其他内容。`;
  }

  /**
   * 使用指定的LLM模型进行合同解析
   */
  private async parseWithModel(
    buffer: Buffer,
    model: LlmModel,
  ): Promise<ParsedContractResult> {
    const text = buffer.toString('utf-8');
    const systemPrompt = this.getSystemPrompt();
    const userMessage = `请从以下合同文本中提取信息：\n\n${text.slice(0, 8000)}`;

    try {
      if (model.provider.providerType === 'anthropic') {
        return await this.parseWithAnthropic(
          model.provider.apiKey,
          model.modelId,
          systemPrompt,
          userMessage,
          model.parameters,
          model.modelId,
        );
      } else if (model.provider.providerType === 'openai') {
        return await this.parseWithOpenAI(
          model.provider.apiKey,
          model.modelId,
          systemPrompt,
          userMessage,
          model.parameters,
          model.modelId,
        );
      } else {
        throw new BadRequestException(`Unsupported LLM provider: ${model.provider.providerType}`);
      }
    } catch (error) {
      this.logger.error(`Error parsing with model ${model.modelId}:`, error);
      throw error;
    }
  }

  /**
   * 使用 Anthropic API 解析
   */
  private async parseWithAnthropic(
    apiKey: string,
    modelId: string,
    systemPrompt: string,
    userMessage: string,
    parameters: Record<string, any> = {},
    usedModelId: string,
  ): Promise<ParsedContractResult> {
    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: modelId,
      max_tokens: parameters.max_tokens || 1024,
      system: systemPrompt,
      temperature: parameters.temperature,
      messages: [
        {
          role: 'user',
          content: userMessage,
        },
      ],
    });

    const rawContent = message.content[0];
    if (rawContent.type !== 'text') {
      throw new BadRequestException('AI returned unexpected content type');
    }

    try {
      const jsonMatch = rawContent.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      const parsed = JSON.parse(jsonMatch[0]);
      return { ...parsed, raw: rawContent.text, usedModel: usedModelId };
    } catch (error: any) {
      this.logger.warn(`Failed to parse JSON response: ${error.message}`);
      return { raw: rawContent.text, notes: '解析结果请查看 raw 字段', usedModel: usedModelId };
    }
  }

  /**
   * 使用 OpenAI API 解析
   */
  private async parseWithOpenAI(
    apiKey: string,
    modelId: string,
    systemPrompt: string,
    userMessage: string,
    parameters: Record<string, any> = {},
    usedModelId: string,
  ): Promise<ParsedContractResult> {
    const client = new OpenAI({ apiKey });

    const message = await client.chat.completions.create({
      model: modelId,
      max_tokens: parameters.max_tokens || 1024,
      temperature: parameters.temperature,
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: userMessage,
        },
      ],
    });

    const content = message.choices[0].message.content;
    if (!content) {
      throw new BadRequestException('AI returned empty response');
    }

    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      const parsed = JSON.parse(jsonMatch[0]);
      return { ...parsed, raw: content, usedModel: usedModelId };
    } catch (error: any) {
      this.logger.warn(`Failed to parse JSON response: ${error.message}`);
      return { raw: content, notes: '解析结果请查看 raw 字段', usedModel: usedModelId };
    }
  }

  /**
   * 带降级机制的合同解析
   * 如果主模型失败，自动尝试备选模型
   */
  async parseContractFile(buffer: Buffer, mimeType: string, tenantId: string): Promise<ParsedContractResult> {
    // 获取租户配置的合同解析模型列表（按优先级排序）
    const models = await this.llmModelService.findByTaskType(tenantId, AiTaskType.CONTRACT_PARSING);

    if (models.length === 0) {
      throw new BadRequestException(
        'No LLM model configured for contract parsing. Please configure models in system settings.',
      );
    }

    let lastError: Error = new Error('No models tried');

    // 逐个尝试模型，直到成功
    for (const model of models) {
      try {
        this.logger.log(`Attempting contract parsing with model: ${model.modelId}`);
        const result = await this.parseWithModel(buffer, model);
        this.logger.log(`Contract parsing succeeded with model: ${model.modelId}`);
        return result;
      } catch (error: any) {
        lastError = error;
        this.logger.warn(`Contract parsing failed with model ${model.modelId}: ${error.message}`);
        // 继续尝试下一个模型
      }
    }

    // 所有模型都失败
    throw new BadRequestException(`All configured LLM models failed: ${lastError.message}`);
  }

  async applyToContract(
    contractId: string,
    data: ParsedContractResult,
    tenantId: string,
  ): Promise<Contract> {
    const contract = await this.contractRepo.findOne({
      where: { id: contractId, tenantId },
    });
    if (!contract) {
      throw new BadRequestException(`Contract ${contractId} not found`);
    }

    if (data.baseRent != null) contract.baseRent = data.baseRent;
    if (data.propertyFee != null) contract.propertyFee = data.propertyFee;
    if (data.rentFreeDays != null) contract.rentFreeDays = data.rentFreeDays;
    if (data.billingType && ['fixed', 'stepped', 'guarantee_plus_share', 'pure_share'].includes(data.billingType)) {
      contract.billingType = data.billingType as any;
    }
    if (data.startDate) contract.startDate = new Date(data.startDate) as any;
    if (data.endDate) contract.endDate = new Date(data.endDate) as any;
    if (data.notes) contract.notes = data.notes;

    return this.contractRepo.save(contract);
  }
}
