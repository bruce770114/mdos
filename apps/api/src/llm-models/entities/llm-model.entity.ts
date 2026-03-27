import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { LlmProvider } from './llm-provider.entity';

export enum AiTaskType {
  CONTRACT_PARSING = 'contract_parsing',      // 合同解析
  CUSTOMER_ANALYSIS = 'customer_analysis',    // 客户分析
  BILL_GENERATION = 'bill_generation',        // 账单生成
  DOCUMENT_OCR = 'document_ocr',              // 文档识别
  DATA_SUMMARIZATION = 'data_summarization',  // 数据总结
  OTHER = 'other',
}

/**
 * LLM 模型配置
 * 关联到供应商，定义具体的模型及其在不同AI任务中的应用
 */
@Entity('llm_models')
@Index(['tenantId', 'aiTaskType'])
@Index(['llmProviderId'])
export class LlmModel extends BaseEntity {
  @Index()
  @Column()
  tenantId: string;

  @Column({ name: 'llm_provider_id' })
  llmProviderId: string;

  /** 模型唯一标识（如：gpt-4-turbo, claude-3-sonnet） */
  @Column()
  modelId: string;

  /** 模型显示名称 */
  @Column()
  modelName: string;

  /** AI 任务类型 */
  @Column({ type: 'varchar', enum: AiTaskType })
  aiTaskType: AiTaskType;

  /** 是否为默认模型 */
  @Column({ default: false })
  isDefault: boolean;

  /** 是否启用 */
  @Column({ default: true })
  enabled: boolean;

  /** 最大输入token数 */
  @Column({ nullable: true })
  maxInputTokens: number;

  /** 最大输出token数 */
  @Column({ nullable: true })
  maxOutputTokens: number;

  /** 模型成本（用于成本估算） */
  @Column('decimal', { precision: 10, scale: 6, nullable: true })
  costPerMilTokenInput: number; // 每百万输入tokens的成本

  @Column('decimal', { precision: 10, scale: 6, nullable: true })
  costPerMilTokenOutput: number; // 每百万输出tokens的成本

  /** 优先级（数字越小优先级越高，同一aiTaskType有多个模型时使用） */
  @Column({ default: 0 })
  priority: number;

  /** 额外参数（如温度、top_p等） */
  @Column({ type: 'jsonb', nullable: true })
  parameters: Record<string, any>;

  /** 描述和说明 */
  @Column({ nullable: true })
  description: string;

  @ManyToOne(() => LlmProvider, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'llm_provider_id' })
  provider: LlmProvider;
}
