import { ApiProperty } from '@nestjs/swagger'
import { TestAttemptStatus } from '@prisma/client'

export class UserTestAttemptSwaggerDTO {
  @ApiProperty({ example: 1, description: 'ID của lần thử bài test' })
  id: number

  @ApiProperty({ example: 1, description: 'ID người dùng' })
  userId: number

  @ApiProperty({ example: 1, description: 'ID bài test' })
  testId: number

  @ApiProperty({
    example: 'IN_PROGRESS',
    description:
      'Trạng thái làm bài: NOT_STARTED, IN_PROGRESS (đang làm), COMPLETED (hoàn thành), FAILED (hoàn thành nhưng sai), ABANDONED (bỏ dở), SKIPPED (bỏ qua)',
    enum: TestAttemptStatus
  })
  status: string

  @ApiProperty({ example: 0, description: 'Thời gian làm bài (giây)', required: false })
  time?: number

  @ApiProperty({ example: 0, description: 'Điểm số', required: false })
  score?: number

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

export class UpdateUserTestAttemptSwaggerDTO {
  @ApiProperty({
    example: 'COMPLETED',
    description:
      'Trạng thái làm bài: NOT_STARTED, IN_PROGRESS (đang làm), COMPLETED (hoàn thành), FAILED (hoàn thành nhưng sai), ABANDONED (bỏ dở), SKIPPED (bỏ qua)',
    enum: TestAttemptStatus,
    required: false
  })
  status?: string
}

export class UserTestAttemptResponseSwaggerDTO {
  @ApiProperty({ example: 200, description: 'Status code' })
  statusCode: number

  @ApiProperty({
    type: UserTestAttemptSwaggerDTO,
    description: 'Dữ liệu lần thử bài test'
  })
  data: UserTestAttemptSwaggerDTO

  @ApiProperty({
    example: 'Lấy thông tin lần thử bài test thành công',
    description: 'Thông báo'
  })
  message: string
}

export class UserTestAttemptListResponseSwaggerDTO {
  @ApiProperty({ example: 200, description: 'Status code' })
  statusCode: number

  @ApiProperty({
    description: 'Dữ liệu danh sách lần thử bài test',
    properties: {
      results: {
        type: 'array',
        items: { $ref: '#/components/schemas/UserTestAttemptSwaggerDTO' }
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
    results: UserTestAttemptSwaggerDTO[]
    pagination: {
      current: number
      pageSize: number
      totalPage: number
      totalItem: number
    }
  }

  @ApiProperty({
    example: 'Lấy danh sách lần thử bài test thành công',
    description: 'Thông báo'
  })
  message: string
}

export class CreateUserTestAttemptParamsSwaggerDTO {
  @ApiProperty({ example: 1, description: 'ID bài test' })
  testId: number
}

export class GetUserTestAttemptListQuerySwaggerDTO {
  @ApiProperty({ example: 1, description: 'Trang hiện tại', required: false })
  currentPage?: number

  @ApiProperty({ example: 10, description: 'Số bản ghi mỗi trang', required: false })
  pageSize?: number

  @ApiProperty({ example: 1, description: 'ID người dùng', required: false })
  userId?: number

  @ApiProperty({ example: 1, description: 'ID bài test', required: false })
  testId?: number

  @ApiProperty({
    example: 'IN_PROGRESS',
    description:
      'Lọc theo trạng thái: NOT_STARTED, IN_PROGRESS (đang làm), COMPLETED (hoàn thành), FAILED (hoàn thành nhưng sai), ABANDONED (bỏ dở), SKIPPED (bỏ qua)',
    enum: TestAttemptStatus,
    required: false
  })
  status?: string
}

export class TestCompletionStatusSwaggerDTO {
  @ApiProperty({ example: true, description: 'Bài test đã hoàn thành chưa' })
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
    enum: TestAttemptStatus
  })
  status: string

  @ApiProperty({ example: 85, description: 'Điểm số (0-100)', required: false })
  score?: number
}

export class TestCompletionResponseSwaggerDTO {
  @ApiProperty({ example: 200, description: 'Mã trạng thái' })
  statusCode: number

  @ApiProperty({
    example: 'Bài test đã hoàn thành và đúng hết',
    description: 'Thông báo'
  })
  message: string

  @ApiProperty({
    type: TestCompletionStatusSwaggerDTO,
    description: 'Dữ liệu trạng thái hoàn thành'
  })
  data: TestCompletionStatusSwaggerDTO
}
