import { IsString, IsEnum, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsUUID } from 'class-validator';
import { AiTaskType } from '../entities/llm-model.entity';

export class CreateLlmModelDto {
  @IsUUID()
  @IsNotEmpty()
  llmProviderId: string;

  @IsString()
  @IsNotEmpty()
  modelId: string;

  @IsString()
  @IsNotEmpty()
  modelName: string;

  @IsEnum(AiTaskType)
  @IsNotEmpty()
  aiTaskType: AiTaskType;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @IsNumber()
  @IsOptional()
  maxInputTokens?: number;

  @IsNumber()
  @IsOptional()
  maxOutputTokens?: number;

  @IsNumber()
  @IsOptional()
  costPerMilTokenInput?: number;

  @IsNumber()
  @IsOptional()
  costPerMilTokenOutput?: number;

  @IsNumber()
  @IsOptional()
  priority?: number;

  @IsOptional()
  parameters?: Record<string, any>;

  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateLlmModelDto {
  @IsUUID()
  @IsOptional()
  llmProviderId?: string;

  @IsString()
  @IsOptional()
  modelId?: string;

  @IsString()
  @IsOptional()
  modelName?: string;

  @IsEnum(AiTaskType)
  @IsOptional()
  aiTaskType?: AiTaskType;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @IsNumber()
  @IsOptional()
  maxInputTokens?: number;

  @IsNumber()
  @IsOptional()
  maxOutputTokens?: number;

  @IsNumber()
  @IsOptional()
  costPerMilTokenInput?: number;

  @IsNumber()
  @IsOptional()
  costPerMilTokenOutput?: number;

  @IsNumber()
  @IsOptional()
  priority?: number;

  @IsOptional()
  parameters?: Record<string, any>;

  @IsString()
  @IsOptional()
  description?: string;
}
