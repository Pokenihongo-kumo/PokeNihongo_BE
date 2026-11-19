import { ApiProperty } from '@nestjs/swagger'
import { LessonContentsType } from '@prisma/client'
import { ExercisesSortField, SortOrder } from '@/common/enum/enum'

class RewardSummarySwaggerDTO {
  @ApiProperty({ example: 1, description: 'ID phần thưởng' })
  id: number

  @ApiProperty({
    example: 'Phần thưởng bài học',
    description: 'Tên phần thưởng theo ngôn ngữ người dùng'
  })
  name: string

  @ApiProperty({ example: 'LESSON', description: 'Loại phần thưởng' })
  rewardType: string

  @ApiProperty({ example: 100, description: 'Giá trị phần thưởng' })
  rewardItem: number

  @ApiProperty({ example: 'EXP', description: 'Mục tiêu phần thưởng' })
  rewardTarget: string
}

// Swagger DTOs - for API documentation only
export class CreateExercisesSwaggerDTO {
  @ApiProperty({
    example: 'VOCABULARY',
    description: 'Loại bài tập',
    enum: LessonContentsType
  })
  exerciseType: LessonContentsType

  @ApiProperty({ example: false, description: 'Trạng thái bị chặn' })
  isBlocked?: boolean

  @ApiProperty({ example: 1, description: 'ID bài học' })
  lessonId: number

  @ApiProperty({ example: 1, description: 'ID bộ đề' })
  testSetId?: number

  @ApiProperty({
    example: [1, 2],
    description: 'Danh sách ID phần thưởng',
    required: false
  })
  rewardId?: number[]
}

export class UpdateExercisesSwaggerDTO {
  @ApiProperty({
    example: 'VOCABULARY',
    description: 'Loại bài tập',
    enum: LessonContentsType,
    required: false
  })
  exerciseType?: LessonContentsType

  @ApiProperty({ example: false, description: 'Trạng thái bị chặn', required: false })
  isBlocked?: boolean

  @ApiProperty({ example: 1, description: 'ID bài học', required: false })
  lessonId?: number

  @ApiProperty({ example: 1, description: 'ID bộ đề', required: false })
  testSetId?: number

  @ApiProperty({
    example: [1, 2],
    description: 'Danh sách ID phần thưởng',
    required: false
  })
  rewardId?: number[]
}

export class GetExercisesListQuerySwaggerDTO {
  @ApiProperty({ example: 1, description: 'Số trang hiện tại', required: false })
  currentPage?: number

  @ApiProperty({
    example: 10,
    description: 'Số lượng bài tập mỗi trang',
    required: false
  })
  pageSize?: number

  @ApiProperty({
    example: 'multiple_choice',
    description: 'Lọc theo loại bài tập',
    enum: LessonContentsType,
    required: false
  })
  exerciseType?: LessonContentsType

  @ApiProperty({ example: 1, description: 'Lọc theo ID bài học', required: false })
  lessonId?: number

  @ApiProperty({
    example: false,
    description: 'Lọc theo trạng thái bị chặn',
    required: false
  })
  isBlocked?: boolean

  @ApiProperty({
    example: '文法',
    description: 'Từ khóa tìm kiếm theo content',
    required: false
  })
  search?: string

  @ApiProperty({
    enum: ExercisesSortField,
    example: ExercisesSortField.CREATED_AT,
    description:
      'Field để sắp xếp theo exerciseType, isBlocked, price, lessonId, createdAt, updatedAt',
    required: false
  })
  sortBy?: ExercisesSortField

  @ApiProperty({
    enum: SortOrder,
    example: SortOrder.DESC,
    description: 'Sắp xếp theo thứ tự tăng dần (asc) hoặc giảm dần (desc)',
    required: false
  })
  sort?: SortOrder
}

export class ExercisesResponseSwaggerDTO {
  @ApiProperty({ example: 1, description: 'ID' })
  id: number

  @ApiProperty({
    example: 'VOCABULARY',
    description: 'Loại bài tập',
    enum: LessonContentsType
  })
  exerciseType: LessonContentsType

  @ApiProperty({
    example: 'この練習では文法を学びます',
    description: 'Nội dung mô tả bài tập'
  })
  content: string

  @ApiProperty({
    example: 'https://example.com/audio.mp3',
    description: 'URL file âm thanh'
  })
  audioUrl: string

  @ApiProperty({ example: false, description: 'Trạng thái bị chặn' })
  isBlocked: boolean

  @ApiProperty({ example: 0.99, description: 'Giá bài tập' })
  price: number

  @ApiProperty({ example: 1, description: 'ID bài học' })
  lessonId: number

  @ApiProperty({
    type: [RewardSummarySwaggerDTO],
    required: false,
    description: 'Thông tin phần thưởng đầy đủ'
  })
  rewards?: RewardSummarySwaggerDTO[]

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Ngày tạo' })
  createdAt: Date

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Ngày cập nhật' })
  updatedAt: Date
}

export class ExercisesListResponseSwaggerDTO {
  @ApiProperty({ type: [ExercisesResponseSwaggerDTO], description: 'Danh sách bài tập' })
  data: ExercisesResponseSwaggerDTO[]

  @ApiProperty({ example: 100, description: 'Tổng số bài tập' })
  total: number

  @ApiProperty({ example: 1, description: 'Trang hiện tại' })
  page: number

  @ApiProperty({ example: 10, description: 'Số bài tập mỗi trang' })
  limit: number

  @ApiProperty({ example: 10, description: 'Tổng số trang' })
  totalPages: number
}
