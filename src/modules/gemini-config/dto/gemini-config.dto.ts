import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class GeminiConfigSwaggerDTO {
  @ApiProperty({ example: 1, description: 'ID của GeminiConfig' })
  id: number

  @ApiProperty({ example: 1, description: 'ID của GeminiConfigModel được tham chiếu' })
  geminiConfigModelId: number

  @ApiProperty({
    example: 'Hãy đánh giá phần nói theo rubric...',
    description: 'Prompt template'
  })
  prompt: string

  @ApiProperty({ example: true, description: 'Trạng thái kích hoạt' })
  isActive: boolean

  @ApiPropertyOptional({ example: '2025-11-03T10:00:00.000Z' })
  createdAt?: Date

  @ApiPropertyOptional({ example: '2025-11-03T10:05:00.000Z' })
  updatedAt?: Date
}

export class CreateGeminiConfigSwaggerDTO {
  @ApiProperty({ example: 1, description: 'ID của GeminiConfigModel' })
  geminiConfigModelId: number

  @ApiProperty({
    example: 'Hãy đánh giá phần nói theo rubric...',
    description: 'Prompt template'
  })
  prompt: string

  @ApiPropertyOptional({
    example: true,
    description: 'Trạng thái kích hoạt',
    default: true
  })
  isActive?: boolean
}

export class UpdateGeminiConfigSwaggerDTO {
  @ApiPropertyOptional({ example: 2, description: 'ID của GeminiConfigModel' })
  geminiConfigModelId?: number

  @ApiPropertyOptional({
    example: 'Cập nhật prompt đánh giá...',
    description: 'Prompt template'
  })
  prompt?: string

  @ApiPropertyOptional({ example: false, description: 'Trạng thái kích hoạt' })
  isActive?: boolean
}
