import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class GeminiConfigModelSwaggerDTO {
  @ApiProperty({ example: 1, description: 'ID của GeminiConfigModel' })
  id: number

  @ApiProperty({ example: 'Pro (VN Guardrails)', description: 'Tên cấu hình model' })
  name: string

  @ApiProperty({ example: 1, description: 'ID tham chiếu tới GeminiModel' })
  geminiModelId: number

  @ApiPropertyOptional({ example: 3, description: 'Tham chiếu preset nếu có' })
  presetId?: number | null

  @ApiPropertyOptional({ example: 2048 })
  maxTokens?: number | null

  @ApiPropertyOptional({ example: false })
  jsonMode?: boolean | null

  @ApiPropertyOptional({ example: 'Bạn là trợ lý thân thiện.' })
  systemInstruction?: string | null

  @ApiPropertyOptional({
    example: { HATE_SPEECH: 'BLOCK', HARASSMENT: 'BLOCK_NONE' },
    description: 'Thiết lập an toàn'
  })
  safetySettings?: Record<string, unknown> | null

  @ApiPropertyOptional({ example: { responseMimeType: 'application/json' } })
  extraParams?: Record<string, unknown> | null

  @ApiPropertyOptional({ example: true })
  isEnabled?: boolean
}

export class CreateGeminiConfigModelSwaggerDTO {
  @ApiProperty({ example: 'Pro (VN Guardrails)', description: 'Tên cấu hình model' })
  name: string

  @ApiProperty({ example: 1, description: 'ID tham chiếu tới GeminiModel' })
  geminiModelId: number

  // temperature/topP/topK đã chuyển sang preset; không còn trên model

  @ApiPropertyOptional({ example: 2048 })
  maxTokens?: number | null

  @ApiPropertyOptional({ example: false })
  jsonMode?: boolean | null

  @ApiPropertyOptional({ example: 'Bạn là trợ lý thân thiện.' })
  systemInstruction?: string | null

  @ApiPropertyOptional({ example: { HATE_SPEECH: 'BLOCK', HARASSMENT: 'BLOCK_NONE' } })
  safetySettings?: Record<string, unknown> | null

  @ApiPropertyOptional({ example: { responseMimeType: 'application/json' } })
  extraParams?: Record<string, unknown> | null

  @ApiPropertyOptional({ example: true })
  isEnabled?: boolean

  @ApiPropertyOptional({ example: 3, description: 'presetId nếu muốn gắn ngay' })
  presetId?: number | null
}

export class UpdateGeminiConfigModelSwaggerDTO {
  @ApiPropertyOptional({ example: 'Pro (VN Guardrails) v2' })
  name?: string

  @ApiPropertyOptional({ example: 2 })
  geminiModelId?: number

  // temperature/topP/topK đã chuyển sang preset; không còn trên model

  @ApiPropertyOptional({ example: 3072 })
  maxTokens?: number | null

  @ApiPropertyOptional({ example: true })
  jsonMode?: boolean | null

  @ApiPropertyOptional({ example: 'Bạn là trợ lý chính xác và ngắn gọn.' })
  systemInstruction?: string | null

  @ApiPropertyOptional({ example: { HATE_SPEECH: 'BLOCK_NONE' } })
  safetySettings?: Record<string, unknown> | null

  @ApiPropertyOptional({ example: { responseMimeType: 'text/plain' } })
  extraParams?: Record<string, unknown> | null

  @ApiPropertyOptional({ example: false })
  isEnabled?: boolean

  @ApiPropertyOptional({ example: 4 })
  presetId?: number | null
}

export class ApplyPresetBodySwaggerDTO {
  @ApiProperty({ example: 'BALANCED', description: 'Key của preset cần áp dụng' })
  presetKey: string
}

export class UpdateConfigModelPolicyBodySwaggerDTO {
  @ApiProperty({
    example: {
      policy: {
        purpose: 'PERSONALIZED_RECOMMENDATIONS',
        entities: [
          {
            entity: 'UserProgress',
            scope: 'SELF_ONLY',
            fields: ['lessonId', 'progressPercentage', 'lastAccessedAt']
          }
        ],
        maskingRules: { email: 'mask' }
      }
    }
  })
  policy: any
}
