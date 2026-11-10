import { ApiProperty } from '@nestjs/swagger'

// Swagger DTOs for API documentation
export class CreateMeaningSwaggerDTO {
  @ApiProperty({
    example: 1,
    description: 'ID của từ vựng',
    minimum: 1
  })
  vocabularyId: number

  @ApiProperty({
    example: 1,
    description: 'ID của loại từ',
    minimum: 1,
    required: false
  })
  wordTypeId?: number

  @ApiProperty({
    example: 'こんにちは、元気ですか？',
    description: 'Câu ví dụ tiếng Nhật',
    maxLength: 1000,
    required: false
  })
  exampleSentenceJp?: string
}

export class UpdateMeaningSwaggerDTO {
  @ApiProperty({
    example: 1,
    description: 'ID của từ vựng',
    minimum: 1,
    required: false
  })
  vocabularyId?: number

  @ApiProperty({
    example: 1,
    description: 'ID của loại từ',
    minimum: 1,
    required: false
  })
  wordTypeId?: number

  @ApiProperty({
    example: 'meaning.1.definition',
    description: 'Key để dịch nghĩa',
    maxLength: 500,
    required: false
  })
  meaningKey?: string

  @ApiProperty({
    example: 'meaning.1.example',
    description: 'Key để dịch câu ví dụ',
    maxLength: 500,
    required: false
  })
  exampleSentenceKey?: string

  @ApiProperty({
    example: 'meaning.1.explanation',
    description: 'Key để dịch giải thích',
    maxLength: 500,
    required: false
  })
  explanationKey?: string

  @ApiProperty({
    example: 'こんにちは、元気ですか？',
    description: 'Câu ví dụ tiếng Nhật',
    maxLength: 1000,
    required: false
  })
  exampleSentenceJp?: string
}

export class TranslationItemSwaggerDTO {
  @ApiProperty({ example: 'vi', description: 'Mã ngôn ngữ' })
  language_code: string

  @ApiProperty({ example: 'Tiếng Nhật', description: 'Giá trị dịch' })
  value: string
}

export class MeaningSwaggerResponseDTO {
  @ApiProperty({ example: 1, description: 'ID của nghĩa' })
  id: number

  @ApiProperty({ example: 1, description: 'ID của từ vựng' })
  vocabularyId: number

  @ApiProperty({ example: 1, description: 'ID của loại từ' })
  wordTypeId?: number

  @ApiProperty({
    example: 'meaning.1.definition',
    description: 'Key để dịch nghĩa'
  })
  meaningKey?: string

  @ApiProperty({
    example: 'meaning.1.example',
    description: 'Key để dịch câu ví dụ'
  })
  exampleSentenceKey?: string

  @ApiProperty({
    example: 'meaning.1.explanation',
    description: 'Key để dịch giải thích'
  })
  explanationKey?: string

  @ApiProperty({
    example: 'こんにちは、元気ですか？',
    description: 'Câu ví dụ tiếng Nhật'
  })
  exampleSentenceJp?: string

  @ApiProperty({
    type: [TranslationItemSwaggerDTO],
    description: 'Danh sách bản dịch nghĩa',
    required: false
  })
  meaningTranslations?: TranslationItemSwaggerDTO[]

  @ApiProperty({
    type: [TranslationItemSwaggerDTO],
    description: 'Danh sách bản dịch câu ví dụ',
    required: false
  })
  exampleTranslations?: TranslationItemSwaggerDTO[]

  @ApiProperty({
    example: '2024-01-01T00:00:00.000Z',
    description: 'Thời gian tạo'
  })
  createdAt: Date

  @ApiProperty({
    example: '2024-01-01T00:00:00.000Z',
    description: 'Thời gian cập nhật'
  })
  updatedAt: Date
}

export class MeaningListSwaggerResponseDTO {
  @ApiProperty({ type: [MeaningSwaggerResponseDTO], description: 'Danh sách nghĩa' })
  data: MeaningSwaggerResponseDTO[]

  @ApiProperty({ example: 10, description: 'Tổng số nghĩa' })
  total: number

  @ApiProperty({ example: 1, description: 'Trang hiện tại' })
  page: number

  @ApiProperty({ example: 10, description: 'Số nghĩa mỗi trang' })
  limit: number

  @ApiProperty({ example: 1, description: 'Tổng số trang' })
  totalPages: number
}
