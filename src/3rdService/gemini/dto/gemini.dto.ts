import { ApiProperty } from '@nestjs/swagger'
import { IsNumber, IsOptional, IsString, IsEnum } from 'class-validator'
import { GeminiModel } from './gemini.enums'

export class EvaluateSpeakingDto {
  @ApiProperty({
    example: 'こんにちは',
    description: 'Câu tiếng Nhật cần đánh giá phát âm'
  })
  @IsString()
  text: string

  @ApiProperty({
    example: 'https://example.com/audio/user-audio.mp3',
    description: 'URL audio file của user'
  })
  @IsString()
  audioUrl: string

  @ApiProperty({
    example: 'こんにちは',
    description: 'Transcription từ audio (nếu có)',
    required: false
  })
  @IsOptional()
  @IsString()
  transcription?: string
}

export class GetPersonalizedRecommendationsDto {
  @ApiProperty({
    example: 1,
    description: 'ID của user'
  })
  @IsNumber()
  userId: number

  @ApiProperty({
    example: 10,
    description: 'Số lượng gợi ý muốn nhận',
    required: false,
    default: 10
  })
  @IsOptional()
  @IsNumber()
  limit?: number
}

export class AIKaiwaDto {
  @ApiProperty({
    example: 'こんにちは、元気ですか？',
    description:
      'Câu hỏi hoặc tin nhắn từ user (tiếng Nhật). Nếu có audioUrl thì message này sẽ được dùng làm reference text để đánh giá phát âm.',
    required: false
  })
  @IsOptional()
  @IsString()
  message?: string

  @ApiProperty({
    example: 'https://example.com/audio/user-audio.mp3',
    description:
      'URL audio file của user (nếu có, sẽ convert sang text bằng Speech-to-Text)',
    required: false
  })
  @IsOptional()
  @IsString()
  audioUrl?: string

  @ApiProperty({
    example: 'conv_123456789',
    description:
      'ID của conversation (nếu là conversation mới thì không cần, sẽ tự generate)',
    required: false
  })
  @IsOptional()
  @IsString()
  conversationId?: string

  @ApiProperty({
    example: true,
    description: 'Có muốn nhận audio response không (mặc định: true)',
    required: false,
    default: true
  })
  @IsOptional()
  includeAudio?: boolean

  @ApiProperty({
    example: false,
    description: 'Có muốn đánh giá phát âm không (chỉ khi có audioUrl và message)',
    required: false,
    default: false
  })
  @IsOptional()
  assessPronunciation?: boolean
}

export class ChatWithGeminiDto {
  @ApiProperty({
    example: 'Xin chào, bạn có thể giúp tôi học tiếng Nhật không?',
    description: 'Tin nhắn từ user'
  })
  @IsString()
  message: string

  @ApiProperty({
    example: 'conv_123456789',
    description:
      'ID của conversation (nếu là conversation mới thì không cần, sẽ tự generate)',
    required: false
  })
  @IsOptional()
  @IsString()
  conversationId?: string

  @ApiProperty({
    example: GeminiModel.GEMINI_2_5_PRO,
    enum: GeminiModel,
    description: 'Tên model Gemini muốn sử dụng (mặc định: gemini-2.5-pro)',
    required: false
  })
  @IsOptional()
  @IsEnum(GeminiModel)
  modelName?: GeminiModel | string

  @ApiProperty({
    example: false,
    description: 'Có lưu lịch sử conversation vào DB không (mặc định: true)',
    required: false,
    default: true
  })
  @IsOptional()
  saveHistory?: boolean

  @ApiProperty({
    example: false,
    description:
      'Bật/tắt Service Account. true = dùng Service Account, false = dùng API Key (mặc định: false - dùng API Key)',
    required: false,
    default: false
  })
  @IsOptional()
  useServiceAccount?: boolean
}

// Swagger DTO cho multipart/form-data
export class ChatWithGeminiMultipartDto {
  @ApiProperty({
    example: 'Xin chào, bạn có thể giúp tôi học tiếng Nhật không?',
    description: 'Tin nhắn từ user',
    required: true
  })
  @IsString()
  message: string

  @ApiProperty({
    example: 'conv_123456789',
    description:
      'ID của conversation (nếu là conversation mới thì không cần, sẽ tự generate)',
    required: false
  })
  @IsOptional()
  @IsString()
  conversationId?: string

  @ApiProperty({
    example: 'gemini-2.5-pro',
    enum: GeminiModel,
    description:
      'Tên model Gemini muốn sử dụng (mặc định: gemini-2.5-pro). Có thể chọn từ dropdown',
    required: false
  })
  @IsOptional()
  @IsString()
  modelName?: string

  @ApiProperty({
    example: 'true',
    description:
      'Có lưu lịch sử conversation vào DB không (mặc định: true). Gửi dưới dạng string "true" hoặc "false"',
    required: false,
    default: 'true'
  })
  @IsOptional()
  @IsString()
  saveHistory?: string

  @ApiProperty({
    example: 'false',
    description:
      'Bật/tắt Service Account. "true" = dùng Service Account, "false" = dùng API Key (mặc định: false - dùng API Key)',
    required: false,
    default: 'false'
  })
  @IsOptional()
  @IsString()
  useServiceAccount?: string
}

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

// DTO cho test native audio dialog model
export class TestNativeAudioDialogDto {
  @ApiProperty({
    example: 'https://example.com/audio/user-audio.mp3',
    description: 'URL audio file của user (hoặc có thể gửi audio buffer trực tiếp)',
    required: false
  })
  @IsOptional()
  @IsString()
  audioUrl?: string

  @ApiProperty({
    example: 'こんにちは',
    description: 'Text message (nếu không có audio)',
    required: false
  })
  @IsOptional()
  @IsString()
  message?: string

  @ApiProperty({
    example: 'conv_123456789',
    description: 'ID của conversation (nếu là conversation mới thì không cần)',
    required: false
  })
  @IsOptional()
  @IsString()
  conversationId?: string
}
