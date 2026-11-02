import { ApiProperty } from '@nestjs/swagger'
import { LessonContentSortField, SortOrder } from '@/common/enum/enum'
import e from 'express'

export class LessonContentResponseSwaggerDTO {
  @ApiProperty({
    example: 1,
    description: 'ID của nội dung bài học'
  })
  id: number

  @ApiProperty({
    example: 1,
    description: 'ID của bài học'
  })
  lessonId: number

  @ApiProperty({
    example: 1,
    description: 'ID của nội dung (polymorphic)'
  })
  contentId: number

  @ApiProperty({
    example: 'VOCABULARY',
    description: 'Loại nội dung (VOCABULARY, GRAMMAR, KANJI, etc.)',
    required: false
  })
  contentType?: string

  @ApiProperty({
    example: 1,
    description: 'Thứ tự nội dung trong bài học'
  })
  contentOrder: number

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

export class LessonContentListResponseSwaggerDTO {
  @ApiProperty({
    type: [LessonContentResponseSwaggerDTO],
    description: 'Danh sách nội dung bài học'
  })
  items: LessonContentResponseSwaggerDTO[]

  @ApiProperty({
    example: 100,
    description: 'Tổng số nội dung bài học'
  })
  total: number

  @ApiProperty({
    example: 1,
    description: 'Trang hiện tại'
  })
  page: number

  @ApiProperty({
    example: 10,
    description: 'Số lượng nội dung mỗi trang'
  })
  limit: number
}

export class CreateLessonContentSwaggerDTO {
  @ApiProperty({
    example: 1,
    description: 'ID của bài học'
  })
  lessonId: number

  @ApiProperty({
    example: [1, 2, 3],
    description: 'ID của nội dung (polymorphic)'
  })
  contentId: number[]

  @ApiProperty({
    enum: ['VOCABULARY', 'GRAMMAR', 'KANJI'],
    example: 'VOCABULARY',
    description: 'Loại nội dung (VOCABULARY, GRAMMAR, KANJI, etc.)'
  })
  contentType: string
}

export class UpdateLessonContentSwaggerDTO {
  @ApiProperty({
    example: 'VOCABULARY',
    description: 'Loại nội dung (VOCABULARY, GRAMMAR, KANJI, etc.)',
    required: false
  })
  contentType?: string

  @ApiProperty({
    example: 2,
    description: 'Thứ tự nội dung trong bài học',
    required: false
  })
  contentOrder?: number
}

export class UpdateLessonContentOrderSwaggerDTO {
  @ApiProperty({
    enum: ['VOCABULARY', 'GRAMMAR', 'KANJI'],
    example: 'VOCABULARY',
    description: 'Loại nội dung (VOCABULARY, GRAMMAR, KANJI, etc.)',
    required: false
  })
  contentType: string

  @ApiProperty({
    example: [3, 1, 2],
    description: 'Thứ tự nội dung trong bài học',
    required: false
  })
  lessonContentId: number[]
}

export class GetLessonContentListQuerySwaggerDTO {
  @ApiProperty({
    example: 1,
    description: 'Số trang hiện tại',
    required: false,
    default: 1,
    minimum: 1
  })
  currentPage?: number

  @ApiProperty({
    example: 10,
    description: 'Số lượng nội dung mỗi trang',
    required: false,
    default: 10,
    minimum: 1,
    maximum: 100
  })
  pageSize?: number

  @ApiProperty({
    example: 1,
    description: 'ID của bài học',
    required: false
  })
  lessonId?: number

  @ApiProperty({
    example: 'VOCABULARY',
    description: 'Loại nội dung (VOCABULARY, GRAMMAR, KANJI, etc.)',
    required: false
  })
  contentType?: string

  @ApiProperty({
    enum: LessonContentSortField,
    example: LessonContentSortField.CREATED_AT,
    description:
      'Field để sắp xếp theo id, lessonId, contentType, contentOrder, createdAt, updatedAt',
    required: false
  })
  sortBy?: LessonContentSortField

  @ApiProperty({
    enum: SortOrder,
    example: SortOrder.DESC,
    description: 'Sắp xếp theo thứ tự tăng dần (asc) hoặc giảm dần (desc)',
    required: false
  })
  sort?: SortOrder
}

// DTOs for grouped lesson content
export class VocabularyContentSwaggerDTO {
  @ApiProperty({ example: 1, description: 'ID từ vựng' })
  id: number

  @ApiProperty({ example: 'こんにちは', description: 'Từ tiếng Nhật' })
  wordJp: string

  @ApiProperty({ example: 'konnichiwa', description: 'Cách đọc' })
  reading: string

  @ApiProperty({
    example: 'https://example.com/image.jpg',
    description: 'URL hình ảnh',
    required: false
  })
  imageUrl?: string

  @ApiProperty({
    example: 'https://example.com/audio.mp3',
    description: 'URL âm thanh',
    required: false
  })
  audioUrl?: string

  @ApiProperty({
    type: [Object],
    description: 'Danh sách nghĩa của từ vựng',
    required: false
  })
  meanings?: Array<{
    id: number
    meaning: string
    exampleSentence?: string
    explanation?: string
  }>

  @ApiProperty({ example: 2, description: 'Thứ tự của nội dung trong bài học' })
  contentOrder: number

  @ApiProperty({ example: 31, description: 'ID bản ghi lessonContents tương ứng' })
  lessonContentId: number
}

export class GrammarContentSwaggerDTO {
  @ApiProperty({ example: 1, description: 'ID ngữ pháp' })
  id: number

  @ApiProperty({ example: 'grammar.1.title', description: 'Key tiêu đề' })
  titleKey: string

  @ApiProperty({
    example: 'Thì hiện tại',
    description: 'Tiêu đề đã dịch',
    required: false
  })
  title?: string

  @ApiProperty({
    example: 'grammar.1.description',
    description: 'Key mô tả',
    required: false
  })
  descriptionKey?: string

  @ApiProperty({
    example: 'Mô tả ngữ pháp',
    description: 'Mô tả đã dịch',
    required: false
  })
  description?: string

  @ApiProperty({
    example: 'grammar.1.usage',
    description: 'Key cách sử dụng',
    required: false
  })
  usageKey?: string

  @ApiProperty({
    example: 'Cách sử dụng',
    description: 'Cách sử dụng đã dịch',
    required: false
  })
  usage?: string

  @ApiProperty({ example: 2, description: 'Thứ tự của nội dung trong bài học' })
  contentOrder: number

  @ApiProperty({ example: 31, description: 'ID bản ghi lessonContents tương ứng' })
  lessonContentId: number
}

export class KanjiContentSwaggerDTO {
  @ApiProperty({ example: 1, description: 'ID Kanji' })
  id: number

  @ApiProperty({ example: '日', description: 'Ký tự Kanji' })
  character: string

  @ApiProperty({ example: 'kanji.1.meaning', description: 'Key nghĩa' })
  meaningKey: string

  @ApiProperty({ example: 'Mặt trời', description: 'Nghĩa đã dịch', required: false })
  meaning?: string

  @ApiProperty({
    example: 'Năm.##Tuổi.',
    description: 'Giải thích chi tiết nghĩa',
    required: false
  })
  explanationMeaning?: string

  @ApiProperty({ example: 'ニチ', description: 'Âm On', required: false })
  onReading?: string

  @ApiProperty({ example: 'ひ', description: 'Âm Kun', required: false })
  kunReading?: string

  @ApiProperty({ example: 4, description: 'Số nét', required: false })
  strokeCount?: number

  @ApiProperty({
    example: 'https://example.com/kanji.jpg',
    description: 'URL hình ảnh',
    required: false
  })
  imageUrl?: string

  @ApiProperty({ example: 2, description: 'Thứ tự của nội dung trong bài học' })
  contentOrder: number

  @ApiProperty({ example: 31, description: 'ID bản ghi lessonContents tương ứng' })
  lessonContentId: number
}

export class GroupedLessonContentSwaggerDTO {
  @ApiProperty({
    type: [VocabularyContentSwaggerDTO],
    description: 'Danh sách từ vựng',
    required: false
  })
  voca?: VocabularyContentSwaggerDTO[]

  @ApiProperty({
    type: [GrammarContentSwaggerDTO],
    description: 'Danh sách ngữ pháp',
    required: false
  })
  grama?: GrammarContentSwaggerDTO[]

  @ApiProperty({
    type: [KanjiContentSwaggerDTO],
    description: 'Danh sách Kanji',
    required: false
  })
  kanji?: KanjiContentSwaggerDTO[]

  @ApiProperty({
    type: Number,
    description: 'ID của bài test ôn tập',
    required: false,
    nullable: true,
    example: 27
  })
  testId?: number | null

  @ApiProperty({
    type: Boolean,
    description: 'Có thể làm bài test cuối cùng (true nếu tất cả exercises đã COMPLETED)',
    required: false,
    example: true
  })
  checkLastTest?: boolean
}

export class LessonContentFullResponseSwaggerDTO {
  @ApiProperty({ example: 200, description: 'Mã trạng thái' })
  statusCode: number

  @ApiProperty({
    type: GroupedLessonContentSwaggerDTO,
    description: 'Dữ liệu nội dung bài học được nhóm theo loại'
  })
  data: GroupedLessonContentSwaggerDTO

  @ApiProperty({
    example: 'Lấy toàn bộ nội dung bài học thành công',
    description: 'Thông báo'
  })
  message: string
}
