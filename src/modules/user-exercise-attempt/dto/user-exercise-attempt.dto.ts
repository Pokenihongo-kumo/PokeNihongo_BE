import { ApiProperty } from '@nestjs/swagger'
import { LessonContentsType } from '@prisma/client'

export class UserExerciseAttemptSwaggerDTO {
  @ApiProperty({ example: 1, description: 'ID của lần thử bài tập' })
  id: number

  @ApiProperty({ example: 1, description: 'ID người dùng' })
  userId: number

  @ApiProperty({ example: 1, description: 'ID bài tập' })
  exerciseId: number

  @ApiProperty({
    example: 'IN_PROGRESS',
    description:
      'Trạng thái làm bài: IN_PROGRESS (đang làm), COMPLETED (hoàn thành), FAILED (hoàn thành nhưng sai), ABANDONED (bỏ dở)',
    enum: ['IN_PROGRESS', 'COMPLETED', 'FAILED', 'ABANDONED']
  })
  status: string

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Ngày tạo' })
  createdAt: Date

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Ngày cập nhật' })
  updatedAt: Date
}

export class TimeSwaggerDTO {
  @ApiProperty({
    example: 0,
    description: 'thời gian làm bài (giây)',
    required: false
  })
  time?: number
}

export class UpdateUserExerciseAttemptSwaggerDTO {
  @ApiProperty({
    example: 'COMPLETED',
    description:
      'Trạng thái làm bài: IN_PROGRESS (đang làm), COMPLETED (hoàn thành), FAILED (hoàn thành nhưng sai), ABANDONED (bỏ dở)',
    enum: ['IN_PROGRESS', 'COMPLETED', 'FAILED', 'ABANDONED'],
    required: false
  })
  status?: string
}

export class UserExerciseAttemptResponseSwaggerDTO {
  @ApiProperty({ example: 200, description: 'Status code' })
  statusCode: number

  @ApiProperty({
    type: UserExerciseAttemptSwaggerDTO,
    description: 'Dữ liệu lần thử bài tập'
  })
  data: UserExerciseAttemptSwaggerDTO

  @ApiProperty({
    example: 'Lấy thông tin lần thử bài tập thành công',
    description: 'Thông báo'
  })
  message: string
}

export class UserExerciseAttemptListResponseSwaggerDTO {
  @ApiProperty({ example: 200, description: 'Status code' })
  statusCode: number

  @ApiProperty({
    description: 'Dữ liệu danh sách lần thử bài tập',
    properties: {
      results: {
        type: 'array',
        items: { $ref: '#/components/schemas/UserExerciseAttemptSwaggerDTO' }
      },
      pagination: {
        type: 'object',
        properties: {
          current: { type: 'number', example: 1 },
          pageSize: { type: 'number', example: 10 },
          totalPage: { type: 'number', example: 5 },
          totalItem: { type: 'number', example: 50 }
        }
      }
    }
  })
  data: {
    results: UserExerciseAttemptSwaggerDTO[]
    pagination: {
      current: number
      pageSize: number
      totalPage: number
      totalItem: number
    }
  }

  @ApiProperty({
    example: 'Lấy danh sách lần thử bài tập thành công',
    description: 'Thông báo'
  })
  message: string
}

export class CreateUserExerciseAttemptParamsSwaggerDTO {
  @ApiProperty({ example: 1, description: 'ID bài tập' })
  exerciseId: number
}

export class GetUserExerciseAttemptListQuerySwaggerDTO {
  @ApiProperty({ example: 1, description: 'Trang hiện tại', required: false })
  currentPage?: number

  @ApiProperty({ example: 10, description: 'Số bản ghi mỗi trang', required: false })
  pageSize?: number

  @ApiProperty({ example: 1, description: 'ID người dùng', required: false })
  userId?: number

  @ApiProperty({ example: 1, description: 'ID bài tập', required: false })
  exerciseId?: number

  @ApiProperty({
    example: 'IN_PROGRESS',
    description:
      'Lọc theo trạng thái: IN_PROGRESS (đang làm), COMPLETED (hoàn thành), FAILED (hoàn thành nhưng sai), ABANDONED (bỏ dở)',
    enum: ['IN_PROGRESS', 'COMPLETED', 'FAILED', 'ABANDONED'],
    required: false
  })
  status?: string
}

export class ExerciseCompletionStatusSwaggerDTO {
  @ApiProperty({ example: true, description: 'Bài tập đã hoàn thành chưa' })
  isCompleted: boolean

  @ApiProperty({ example: 10, description: 'Tổng số câu hỏi' })
  totalQuestions: number

  @ApiProperty({ example: 8, description: 'Số câu đã trả lời' })
  answeredQuestions: number

  @ApiProperty({ example: 2, description: 'Số câu chưa trả lời' })
  unansweredQuestions: number

  @ApiProperty({
    example: [9, 10],
    description: 'Danh sách ID câu hỏi chưa trả lời',
    type: [Number],
    required: false
  })
  unansweredQuestionIds?: number[]

  @ApiProperty({ example: true, description: 'Tất cả câu trả lời có đúng không' })
  allCorrect: boolean

  @ApiProperty({
    example: 'COMPLETED',
    description: 'Trạng thái hiện tại của attempt',
    enum: ['IN_PROGRESS', 'COMPLETED', 'FAILED', 'ABANDONED']
  })
  status: string

  @ApiProperty({
    example: 80,
    description: 'Phần trăm câu trả lời đúng (0-100)'
  })
  correctPercentage: number
}

export class ExerciseCompletionResponseSwaggerDTO {
  @ApiProperty({ example: 200, description: 'Mã trạng thái' })
  statusCode: number

  @ApiProperty({ example: 'Bài tập đã hoàn thành và đúng hết', description: 'Thông báo' })
  message: string

  @ApiProperty({
    type: ExerciseCompletionStatusSwaggerDTO,
    description: 'Dữ liệu trạng thái hoàn thành'
  })
  data: ExerciseCompletionStatusSwaggerDTO
}

export class LatestExerciseAttemptSwaggerDTO {
  @ApiProperty({ example: 1, description: 'ID của lần thử bài tập' })
  id: number

  @ApiProperty({ example: 1, description: 'ID người dùng' })
  userId: number

  @ApiProperty({ example: 1, description: 'ID bài tập' })
  exerciseId: number

  @ApiProperty({
    example: 'multiple_choice',
    description: 'Loại bài tập',
    enum: LessonContentsType
  })
  exerciseType: LessonContentsType

  @ApiProperty({
    example: 'COMPLETED',
    description:
      'Trạng thái làm bài: IN_PROGRESS (đang làm), COMPLETED (hoàn thành), FAILED (hoàn thành nhưng sai), ABANDONED (bỏ dở)',
    enum: ['IN_PROGRESS', 'COMPLETED', 'FAILED', 'ABANDONED']
  })
  status: string

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Ngày tạo' })
  createdAt: Date

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Ngày cập nhật' })
  updatedAt: Date
}

export class LatestExerciseAttemptsByLessonResSwaggerDTO {
  @ApiProperty({ example: 200, description: 'Mã trạng thái' })
  statusCode: number

  @ApiProperty({
    type: [LatestExerciseAttemptSwaggerDTO],
    description:
      'Danh sách exercise attempt gần nhất của user cho mỗi exercise trong lesson'
  })
  data: LatestExerciseAttemptSwaggerDTO[]

  @ApiProperty({
    example: 'Lấy danh sách exercise gần nhất thành công',
    description: 'Thông báo'
  })
  message: string
}
