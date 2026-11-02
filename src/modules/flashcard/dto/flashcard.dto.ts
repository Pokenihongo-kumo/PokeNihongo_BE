import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateFlashcardDeckSwaggerDTO {
  @ApiProperty({ example: 'JLPT N5 Core', description: 'Tên bộ flashcard' })
  name: string

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    description: 'Thông tin metadata tùy chọn'
  })
  metadata?: Record<string, any>
}

export class UpdateFlashcardDeckSwaggerDTO {
  @ApiPropertyOptional({
    example: 'JLPT N5 Core (Updated)',
    description: 'Tên bộ flashcard'
  })
  name?: string

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    description: 'Thông tin metadata tùy chọn'
  })
  metadata?: Record<string, any>
}

export class GetFlashcardDeckListQuerySwaggerDTO {
  @ApiPropertyOptional({ example: 1, description: 'Trang hiện tại', minimum: 1 })
  currentPage?: number

  @ApiPropertyOptional({
    example: 10,
    description: 'Số bản ghi mỗi trang',
    minimum: 1,
    maximum: 100
  })
  pageSize?: number
}

export class CreateFlashcardCardSwaggerDTO {
  @ApiProperty({
    example: 123,
    description: 'ID nội dung tương ứng với contentType (vocabularyId/kanjiId/grammarId)',
    nullable: true
  })
  id?: number | null

  @ApiProperty({
    example: 'VOCABULARY',
    enum: ['VOCABULARY', 'KANJI', 'GRAMMAR'],
    description: 'Loại nội dung của thẻ'
  })
  contentType: 'VOCABULARY' | 'KANJI' | 'GRAMMAR'

  @ApiPropertyOptional({
    example: 'Nhớ phát âm *ko-n-ni-chi-wa*',
    description: 'Ghi chú thêm'
  })
  notes?: string

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    description: 'Metadata bổ sung'
  })
  metadata?: Record<string, any>
}

export class UpdateFlashcardCardSwaggerDTO {
  @ApiProperty({ example: 1, description: 'ID bộ flashcard' })
  deckId: number

  @ApiProperty({ example: 1, description: 'ID thẻ flashcard' })
  cardId: number

  @ApiPropertyOptional({
    example: 'ACTIVE',
    enum: ['ACTIVE', 'ARCHIVED'],
    description: 'Trạng thái thẻ'
  })
  status?: 'ACTIVE' | 'ARCHIVED'

  @ApiPropertyOptional({ example: 'Ghi chú mới', description: 'Ghi chú (cho phép null)' })
  notes?: string | null

  @ApiPropertyOptional({ example: true, description: 'Đánh dấu đã đọc' })
  read?: boolean

  @ApiPropertyOptional({
    type: 'object',
    example: {
      wordJp: '日本語',
      reading: 'にほんご',
      audioUrl: 'https://res.cloudinary.com/audio.mp3',
      imageUrl: 'https://res.cloudinary.com/image.jpg',
      meanings: 'Nghĩa của từ, cách đọc, ví dụ'
    },
    additionalProperties: true,
    description: 'Metadata bổ sung'
  })
  metadata?: Record<string, any>
}

export class GetFlashcardCardListQuerySwaggerDTO {
  @ApiProperty({ example: 1, description: 'ID bộ flashcard' })
  @ApiPropertyOptional({ example: 1, minimum: 1, description: 'Trang hiện tại' })
  currentPage?: number

  @ApiPropertyOptional({ example: 10, minimum: 1, description: 'Số bản ghi mỗi trang' })
  pageSize?: number

  @ApiPropertyOptional({
    example: 'VOCABULARY',
    enum: ['VOCABULARY', 'KANJI', 'GRAMMAR', 'CUSTOM'],
    description: 'Lọc theo loại nội dung'
  })
  contentType?: 'VOCABULARY' | 'KANJI' | 'GRAMMAR' | 'CUSTOM'

  @ApiPropertyOptional({ example: 'xin chào', description: 'Từ khóa tìm kiếm' })
  search?: string
}

export class FlashcardImportItemSwaggerDTO {
  @ApiProperty({
    example: 'VOCABULARY',
    enum: ['VOCABULARY', 'KANJI', 'GRAMMAR'],
    description: 'Loại nội dung cần import'
  })
  contentType: 'VOCABULARY' | 'KANJI' | 'GRAMMAR'

  @ApiProperty({ example: 101, description: 'ID nội dung tương ứng' })
  contentId: number
}

export class FlashcardImportCardsBodySwaggerDTO {
  @ApiProperty({
    type: [FlashcardImportItemSwaggerDTO],
    description: 'Danh sách nội dung cần import',
    minItems: 1
  })
  items: FlashcardImportItemSwaggerDTO[]
}

export class FlashcardLibrarySearchQuerySwaggerDTO {
  @ApiPropertyOptional({
    example: 'VOCABULARY',
    enum: ['VOCABULARY', 'KANJI', 'GRAMMAR'],
    description: 'Loại nội dung muốn tra cứu',
    default: 'VOCABULARY'
  })
  type?: 'VOCABULARY' | 'KANJI' | 'GRAMMAR'

  @ApiPropertyOptional({ example: 1, minimum: 1, description: 'Trang hiện tại' })
  currentPage?: number

  @ApiPropertyOptional({
    example: 10,
    minimum: 1,
    maximum: 100,
    description: 'Số bản ghi mỗi trang'
  })
  pageSize?: number

  @ApiPropertyOptional({ example: 'xin chào', description: 'Từ khóa tìm kiếm' })
  search?: string

  @ApiPropertyOptional({
    example: 5,
    minimum: 1,
    maximum: 5,
    description: 'Lọc theo cấp độ JLPT (dành cho từ vựng / kanji)'
  })
  jlptLevel?: number

  @ApiPropertyOptional({
    example: 'N5',
    description: 'Lọc theo level (dành cho grammar), so khớp dạng chuỗi'
  })
  level?: string
}

export class FlashcardReviewQuerySwaggerDTO {
  @ApiPropertyOptional({
    example: 20,
    minimum: 1,
    maximum: 100,
    description: 'Số lượng thẻ tối đa cần lấy'
  })
  limit?: number
}

export class FlashcardReviewActionSwaggerDTO {
  @ApiProperty({ example: 1, description: 'ID bộ flashcard' })
  deckId: number

  @ApiProperty({ example: 1, description: 'ID thẻ flashcard' })
  cardId: number

  @ApiProperty({
    example: 'correct',
    enum: ['correct', 'incorrect'],
    description: 'Kết quả ôn tập'
  })
  result: 'correct' | 'incorrect'

  @ApiPropertyOptional({
    example: 'Nhớ luyện thêm phần này',
    description: 'Ghi chú kết quả'
  })
  message?: string
}

export class DeleteFlashcardCardsBodySwaggerDTO {
  @ApiProperty({ example: 1, description: 'ID bộ flashcard' })
  deckId: number

  @ApiProperty({
    type: [Number],
    example: [1, 2, 3],
    description: 'Danh sách ID các thẻ flashcard cần xóa',
    minItems: 1
  })
  cardIds: number[]
}

export class FlashcardReadBodySwaggerDTO {
  @ApiProperty({ example: 1, description: 'ID bộ flashcard' })
  deckId: number

  @ApiProperty({ example: 1, description: 'ID thẻ flashcard' })
  cardId: number

  @ApiProperty({
    example: true,
    description: 'Đánh dấu đã đọc (true) hoặc chưa đọc (false)'
  })
  read: boolean
}
