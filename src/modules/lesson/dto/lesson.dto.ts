import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { LessonSortField, SortOrder } from '@/common/enum/enum'

export class LessonResponseSwaggerDTO {
  @ApiProperty({
    example: 1,
    description: 'ID của bài học'
  })
  id: number

  @ApiProperty({
    example: '挨拶の基本',
    description: 'Tiêu đề bài học bằng tiếng Nhật'
  })
  titleJp: string

  @ApiProperty({
    example: 'lesson.1.title',
    description: 'Key để dịch tiêu đề bài học'
  })
  titleKey: string

  @ApiPropertyOptional({
    example: 'Bài 1: Chào hỏi & Giới thiệu bản thân',
    description: 'Tiêu đề bài học đã dịch (string khi có lang, array khi không có lang)',
    oneOf: [
      { type: 'string' },
      {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            language: { type: 'string', example: 'lang_1' },
            value: { type: 'string', example: 'Bài 1: Chào hỏi & Giới thiệu bản thân' }
          }
        }
      }
    ]
  })
  title?: string | Array<{ language: string; value: string }>

  @ApiProperty({
    example: 5,
    description: 'Cấp độ JLPT (1-5)',
    required: false
  })
  levelJlpt?: number

  @ApiProperty({
    example: 45,
    description: 'Thời gian ước tính hoàn thành (phút)'
  })
  estimatedTimeMinutes: number

  @ApiProperty({
    example: 1,
    description: 'Thứ tự bài học trong danh mục'
  })
  lessonOrder: number

  @ApiProperty({
    example: true,
    description: 'Trạng thái xuất bản'
  })
  isPublished: boolean

  @ApiProperty({
    example: '2024-01-01T00:00:00.000Z',
    description: 'Thời gian xuất bản',
    required: false
  })
  publishedAt?: Date

  @ApiProperty({
    example: '1.0.0',
    description: 'Phiên bản bài học'
  })
  version: string

  @ApiProperty({
    example: 1,
    description: 'ID danh mục bài học'
  })
  lessonCategoryId: number

  @ApiPropertyOptional({
    type: [Number],
    example: [1, 2],
    description: 'Danh sách ID phần thưởng'
  })
  rewardId?: number[]

  @ApiPropertyOptional({
    example: 1,
    description: 'ID bài test ôn tập',
    required: false
  })
  testId?: number | null

  @ApiProperty({
    example: 1,
    description: 'ID người tạo'
  })
  createdById: number

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

export class LessonListResponseSwaggerDTO {
  @ApiProperty({
    type: [LessonResponseSwaggerDTO],
    description: 'Danh sách bài học'
  })
  items: LessonResponseSwaggerDTO[]

  @ApiProperty({
    example: 100,
    description: 'Tổng số bài học'
  })
  total: number

  @ApiProperty({
    example: 1,
    description: 'Trang hiện tại'
  })
  page: number

  @ApiProperty({
    example: 10,
    description: 'Số lượng bài học mỗi trang'
  })
  limit: number
}

// Request DTOs
export class CreateLessonSwaggerDTO {
  @ApiProperty({
    example: '挨拶の基本',
    description: 'Tiêu đề bài học bằng tiếng Nhật'
  })
  titleJp: string

  @ApiProperty({
    example: 5,
    description: 'Cấp độ JLPT (1-5)',
    required: false
  })
  levelJlpt?: number

  @ApiProperty({
    example: 45,
    description: 'Thời gian ước tính hoàn thành (phút)',
    required: false
  })
  estimatedTimeMinutes?: number

  @ApiProperty({
    example: 1,
    description: 'Thứ tự bài học trong danh mục',
    required: false
  })
  lessonOrder?: number

  @ApiProperty({
    example: false,
    description: 'Trạng thái xuất bản',
    required: false
  })
  isPublished?: boolean

  @ApiProperty({
    example: '1.0.0',
    description: 'Phiên bản bài học',
    required: false
  })
  version?: string

  @ApiProperty({
    example: 1,
    description: 'ID danh mục bài học'
  })
  lessonCategoryId: number

  @ApiPropertyOptional({
    type: [Number],
    example: [1, 2],
    description: 'Danh sách ID phần thưởng'
  })
  rewardId?: number[]

  @ApiPropertyOptional({
    example: 1,
    description: 'ID bài test ôn tập',
    required: false
  })
  testId?: number | null

  @ApiPropertyOptional({
    description: 'Bản dịch cho tiêu đề bài học (Minna no Nihongo Lesson 1)',
    example: {
      meaning: [
        { language_code: 'vi', value: 'Cách chào hỏi cơ bản' },
        { language_code: 'en', value: 'Basic Greetings' }
      ]
    }
  })
  translations?: {
    meaning: Array<{ language_code: string; value: string }>
  }
}

export class UpdateLessonSwaggerDTO {
  @ApiProperty({
    example: 'aisatsu-no-kihon',
    description: 'URL slug của bài học',
    required: false
  })
  slug?: string

  @ApiProperty({
    example: 'lesson.1.title',
    description: 'Key để dịch tiêu đề bài học',
    required: false
  })
  titleKey?: string

  @ApiProperty({
    example: 5,
    description: 'Cấp độ JLPT (1-5)',
    required: false
  })
  levelJlpt?: number

  @ApiProperty({
    example: 30,
    description: 'Thời gian ước tính hoàn thành (phút)',
    required: false
  })
  estimatedTimeMinutes?: number

  @ApiProperty({
    example: 1,
    description: 'Thứ tự bài học trong danh mục',
    required: false
  })
  lessonOrder?: number

  @ApiProperty({
    example: true,
    description: 'Trạng thái xuất bản',
    required: false
  })
  isPublished?: boolean

  @ApiProperty({
    example: '1.1.0',
    description: 'Phiên bản bài học',
    required: false
  })
  version?: string

  @ApiProperty({
    example: 1,
    description: 'ID danh mục bài học',
    required: false
  })
  lessonCategoryId?: number

  @ApiPropertyOptional({
    type: [Number],
    example: [2, 3],
    description: 'Danh sách ID phần thưởng',
    required: false
  })
  rewardId?: number[]

  @ApiPropertyOptional({
    example: 1,
    description: 'ID bài test ôn tập',
    required: false
  })
  testId?: number | null
}

export class GetLessonListQuerySwaggerDTO {
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
    description: 'Số lượng bài học mỗi trang',
    required: false,
    default: 10,
    minimum: 1,
    maximum: 100
  })
  pageSize?: number

  @ApiProperty({
    example: 'greetings',
    description: 'Từ khóa tìm kiếm',
    required: false,
    maxLength: 100
  })
  search?: string

  @ApiProperty({
    example: 1,
    description: 'ID danh mục bài học',
    required: false
  })
  lessonCategoryId?: number

  @ApiProperty({
    example: 5,
    description: 'Cấp độ JLPT (1-5)',
    required: false
  })
  levelJlpt?: number

  @ApiProperty({
    example: true,
    description: 'Trạng thái xuất bản',
    required: false
  })
  isPublished?: boolean

  @ApiProperty({
    enum: LessonSortField,
    example: LessonSortField.CREATED_AT,
    description:
      'Field để sắp xếp theo slug, titleKey, levelJlpt, lessonOrder, isPublished, createdAt, updatedAt',
    required: false
  })
  sortBy?: LessonSortField

  @ApiProperty({
    enum: SortOrder,
    example: SortOrder.DESC,
    description: 'Sắp xếp theo thứ tự tăng dần (asc) hoặc giảm dần (desc)',
    required: false
  })
  sort?: SortOrder
}
