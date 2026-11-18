import { ApiProperty } from '@nestjs/swagger'
import { IsNumber, IsOptional, IsString } from 'class-validator'

// Swagger DTO cho multipart/form-data của recommendations
export class RecommendationsMultipartDto {
  @ApiProperty({
    example: '10',
    description: 'Số lượng gợi ý muốn nhận (string trong multipart)',
    required: false,
    default: '10'
  })
  @IsOptional()
  @IsString()
  limit?: string

  @ApiProperty({
    example: 'false',
    description:
      'Bật/tắt Service Account. "true" = dùng Service Account, "false" = dùng API Key (mặc định: false)',
    required: false,
    default: 'false'
  })
  @IsOptional()
  @IsString()
  useServiceAccount?: string
}

// === Saved recommendations APIs ===
export class ListSavedRecommendationsQueryDto {
  @ApiProperty({
    example: 'PENDING',
    required: false,
    description: 'Trạng thái lọc: PENDING|DONE|DISMISSED'
  })
  @IsOptional()
  @IsString()
  status?: 'PENDING' | 'DONE' | 'DISMISSED'

  @ApiProperty({ example: 50, required: false, description: 'Giới hạn số bản ghi' })
  @IsOptional()
  @IsNumber()
  limit?: number
}

export class UpdateRecommendationStatusDto {
  @ApiProperty({ example: 'DONE', description: 'Trạng thái mới: DONE|DISMISSED' })
  @IsString()
  status: 'DONE' | 'DISMISSED'
}
