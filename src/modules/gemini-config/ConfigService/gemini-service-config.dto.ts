import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { GeminiConfigType } from '@prisma/client'

export class CreateGeminiServiceConfigSwaggerDTO {
  @ApiProperty({
    enum: GeminiConfigType,
    example: 'SPEAKING_EVALUATION',
    description: 'Loại service (use-case)'
  })
  serviceType: GeminiConfigType

  @ApiProperty({ example: 1, description: 'ID của GeminiConfig' })
  geminiConfigId: number

  @ApiPropertyOptional({ example: false, description: 'Đặt làm mặc định cho service' })
  isDefault?: boolean

  @ApiPropertyOptional({ example: true, description: 'Trạng thái kích hoạt' })
  isActive?: boolean
}

export class UpdateGeminiServiceConfigToggleSwaggerDTO {
  @ApiProperty({ example: true, description: 'Bật/tắt cấu hình cho service' })
  isActive: boolean
}

export class UpdateGeminiServiceConfigSwaggerDTO {
  @ApiProperty({ example: 1, description: 'ID của GeminiConfig mới để thay thế' })
  geminiConfigId: number
}

export class GeminiServiceConfigSwaggerDTO {
  @ApiProperty({ example: 1 })
  id: number

  @ApiProperty({ enum: GeminiConfigType, example: 'SPEAKING_EVALUATION' })
  serviceType: GeminiConfigType

  @ApiProperty({ example: 3 })
  geminiConfigId: number

  @ApiProperty({ example: false })
  isDefault: boolean

  @ApiProperty({ example: true })
  isActive: boolean

  @ApiPropertyOptional({ example: '2025-11-03T10:00:00.000Z' })
  createdAt?: Date

  @ApiPropertyOptional({ example: '2025-11-03T10:05:00.000Z' })
  updatedAt?: Date
}
