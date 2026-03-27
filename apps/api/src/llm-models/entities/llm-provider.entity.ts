import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

export enum LlmProviderType {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  TONGYI = 'tongyi', // 通义千问 (Alibaba)
  QWEN = 'qwen',
  CUSTOM = 'custom',
}

/**
 * LLM 供应商配置
 * 每个租户可配置多个供应商和多个模型
 */
@Entity('llm_providers')
@Index(['tenantId', 'providerType'])
export class LlmProvider extends BaseEntity {
  @Index()
  @Column()
  tenantId: string;

  /** 供应商唯一标识（如：openai-1, anthropic-prod） */
  @Column()
  name: string;

  /** 供应商类型 */
  @Column({ type: 'varchar', enum: LlmProviderType })
  providerType: LlmProviderType;

  /** API 密钥（加密存储） */
  @Column()
  apiKey: string;

  /** API 端点（可选，用于自定义端点） */
  @Column({ nullable: true })
  apiEndpoint: string;

  /** 是否启用 */
  @Column({ default: true })
  enabled: boolean;

  /** 显示优先级（数字越小优先级越高） */
  @Column({ default: 0 })
  priority: number;

  /** 额外配置（JSON）- 存储供应商特定的配置 */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  /** 描述 */
  @Column({ nullable: true })
  description: string;
}
