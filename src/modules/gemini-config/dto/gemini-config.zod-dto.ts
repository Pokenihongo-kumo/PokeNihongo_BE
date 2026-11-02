import { createZodDto } from 'nestjs-zod'
import {
  CreateGeminiConfigBodySchema,
  CreateGeminiConfigResSchema,
  GetGeminiConfigResSchema,
  GetParamsGeminiConfigSchema,
  UpdateGeminiConfigBodySchema,
  UpdateGeminiConfigResSchema
} from '../entities/gemini-config.entity'
import {
  CreateGeminiConfigModelBodySchema,
  UpdateGeminiConfigModelBodySchema,
  GetParamsGeminiConfigModelSchema,
  GeminiConfigModelResSchema
} from '../entities/gemini-config-model.entity'

export class CreateGeminiConfigBodyDTO extends createZodDto(
  CreateGeminiConfigBodySchema
) {}
export class CreateGeminiConfigResDTO extends createZodDto(CreateGeminiConfigResSchema) {}
export class UpdateGeminiConfigBodyDTO extends createZodDto(
  UpdateGeminiConfigBodySchema
) {}
export class UpdateGeminiConfigResDTO extends createZodDto(UpdateGeminiConfigResSchema) {}
export class GetParamsGeminiConfigDTO extends createZodDto(GetParamsGeminiConfigSchema) {}
export class GetGeminiConfigResDTO extends createZodDto(GetGeminiConfigResSchema) {}

// GeminiConfigModel DTOs
export class CreateGeminiConfigModelBodyDTO extends createZodDto(
  CreateGeminiConfigModelBodySchema
) {}
export class UpdateGeminiConfigModelBodyDTO extends createZodDto(
  UpdateGeminiConfigModelBodySchema
) {}
export class GetParamsGeminiConfigModelDTO extends createZodDto(
  GetParamsGeminiConfigModelSchema
) {}
export class GeminiConfigModelResDTO extends createZodDto(GeminiConfigModelResSchema) {}
