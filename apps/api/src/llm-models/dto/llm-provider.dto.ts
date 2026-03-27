import { IsString, IsEnum, IsNotEmpty, IsOptional, IsNumber, IsBoolean } from 'class-validator';
import { LlmProviderType } from '../entities/llm-provider.entity';

export class CreateLlmProviderDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(LlmProviderType)
  @IsNotEmpty()
  providerType: LlmProviderType;

  @IsString()
  @IsNotEmpty()
  apiKey: string;

  @IsString()
  @IsOptional()
  apiEndpoint?: string;

  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @IsNumber()
  @IsOptional()
  priority?: number;

  @IsOptional()
  metadata?: Record<string, any>;

  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateLlmProviderDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  apiKey?: string;

  @IsString()
  @IsOptional()
  apiEndpoint?: string;

  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @IsNumber()
  @IsOptional()
  priority?: number;

  @IsOptional()
  metadata?: Record<string, any>;

  @IsString()
  @IsOptional()
  description?: string;
}
