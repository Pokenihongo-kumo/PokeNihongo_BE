import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { TestStatus } from '@prisma/client'

export enum HistoryType {
  TEST = 'TEST',
  EXERCISE = 'EXERCISE'
}

export class HistoryItemSwaggerDTO {
  @ApiProperty({ example: 1, description: 'ID của attempt' })
  id: number

  @ApiProperty({
    enum: HistoryType,
    example: HistoryType.TEST,
    description: 'Loại lịch sử (TEST hoặc EXERCISE)'
  })
  type: HistoryType

  @ApiPropertyOptional({ example: 1, description: 'ID của Test (nếu type = TEST)' })
  testId?: number | null

  @ApiPropertyOptional({
    example: 'Kiểm tra từ vựng N3',
    description: 'Tên test (nếu type = TEST)'
  })
  testName?: string | null

  @ApiPropertyOptional({
    example: 1,
    description: 'ID của Exercise (nếu type = EXERCISE)'
  })
  exerciseId?: number | null

  @ApiPropertyOptional({
    example: 'Bài tập N3',
    description: 'Tên exercise (nếu type = EXERCISE)'
  })
  exerciseName?: string | null

  @ApiProperty({
    example: 'COMPLETED',
    description: 'Trạng thái (COMPLETED, FAILED, etc.)'
  })
  status: string

  @ApiPropertyOptional({ example: 80, description: 'Điểm số (%)' })
  score?: number | null

  @ApiProperty({ example: 10, description: 'Tổng số câu hỏi' })
  totalQuestions: number

  @ApiProperty({ example: 8, description: 'Số câu trả lời đúng' })
  correctAnswers: number

  @ApiProperty({ example: 2, description: 'Số câu trả lời sai' })
  incorrectAnswers: number

  @ApiPropertyOptional({ example: 1200, description: 'Thời gian làm bài (giây)' })
  time?: number | null

  @ApiProperty({ example: '2024-01-01T10:00:00.000Z', description: 'Thời gian tạo' })
  createdAt: Date

  @ApiProperty({ example: '2024-01-01T10:20:00.000Z', description: 'Thời gian cập nhật' })
  updatedAt: Date
}

export class AdminHistoryItemSwaggerDTO extends HistoryItemSwaggerDTO {
  @ApiPropertyOptional({
    example: 1,
    description: 'ID của user (chỉ có trong admin response)'
  })
  userId?: number

  @ApiPropertyOptional({
    type: 'object',
    properties: {
      id: { type: 'number', example: 1 },
      email: { type: 'string', example: 'user@example.com' }
    },
    description: 'Thông tin user (chỉ có trong admin response)'
  })
  user?: {
    id: number
    email?: string | null
  }
}

export class GetHistoryListQuerySwaggerDTO {
  @ApiPropertyOptional({ example: 1, description: 'Trang hiện tại' })
  currentPage?: number

  @ApiPropertyOptional({ example: 10, description: 'Số item mỗi trang' })
  pageSize?: number

  @ApiPropertyOptional({
    enum: HistoryType,
    example: HistoryType.TEST,
    description: 'Filter theo loại (TEST hoặc EXERCISE)'
  })
  type?: HistoryType

  @ApiPropertyOptional({ example: 'COMPLETED', description: 'Filter theo status' })
  status?: string
}

export class GetAdminHistoryListQuerySwaggerDTO {
  @ApiPropertyOptional({ example: 1, description: 'Trang hiện tại' })
  currentPage?: number

  @ApiPropertyOptional({ example: 10, description: 'Số item mỗi trang' })
  pageSize?: number

  @ApiPropertyOptional({
    enum: HistoryType,
    example: HistoryType.TEST,
    description: 'Filter theo loại (TEST hoặc EXERCISE)'
  })
  type?: HistoryType

  @ApiPropertyOptional({ example: 'COMPLETED', description: 'Filter theo status' })
  status?: string

  @ApiPropertyOptional({
    example: 1,
    description: 'Filter theo userId (Admin có thể xem lịch sử của user cụ thể)'
  })
  userId?: number
}

export class HistoryListResponseSwaggerDTO {
  @ApiProperty({ example: 200, description: 'Mã trạng thái HTTP' })
  statusCode: number

  @ApiProperty({
    type: 'object',
    properties: {
      results: {
        type: 'array',
        items: { $ref: '#/components/schemas/HistoryItemSwaggerDTO' }
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
    },
    description: 'Dữ liệu danh sách lịch sử và phân trang'
  })
  data: {
    results: HistoryItemSwaggerDTO[]
    pagination: {
      current: number
      pageSize: number
      totalPage: number
      totalItem: number
    }
  }

  @ApiProperty({ example: 'Lấy danh sách lịch sử thành công', description: 'Thông báo' })
  message: string
}

export class AdminHistoryListResponseSwaggerDTO {
  @ApiProperty({ example: 200, description: 'Mã trạng thái HTTP' })
  statusCode: number

  @ApiProperty({
    type: 'object',
    properties: {
      results: {
        type: 'array',
        items: { $ref: '#/components/schemas/AdminHistoryItemSwaggerDTO' }
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
    },
    description:
      'Dữ liệu danh sách lịch sử và phân trang (Admin - có thêm thông tin user)'
  })
  data: {
    results: AdminHistoryItemSwaggerDTO[]
    pagination: {
      current: number
      pageSize: number
      totalPage: number
      totalItem: number
    }
  }

  @ApiProperty({ example: 'Lấy danh sách lịch sử thành công', description: 'Thông báo' })
  message: string
}

export class RecentExerciseItemSwaggerDTO {
  @ApiProperty({ example: 5, description: 'ID của bài exercise' })
  exerciseId: number

  @ApiPropertyOptional({
    example: 'Flashcard N3 - Chủ đề 5',
    description: 'Tên bài exercise'
  })
  exerciseName?: string | null

  @ApiPropertyOptional({ example: 1, description: 'ID của bài lesson' })
  lessonId?: number | null

  @ApiPropertyOptional({
    example: 'Bài 1: Chào hỏi & Giới thiệu bản thân',
    description: 'Tiêu đề bài lesson (đã dịch)'
  })
  lessonTitle?: string | null

  @ApiProperty({ example: 'COMPLETED', description: 'Trạng thái attempt gần nhất' })
  status: string
}

export class GetRecentExercisesQuerySwaggerDTO {
  @ApiPropertyOptional({ example: 1, description: 'Trang hiện tại' })
  currentPage?: number

  @ApiPropertyOptional({ example: 10, description: 'Số item mỗi trang' })
  pageSize?: number
}

export class RecentExercisesResponseSwaggerDTO {
  @ApiProperty({ example: 200, description: 'Mã trạng thái HTTP' })
  statusCode: number

  @ApiProperty({
    type: 'object',
    properties: {
      results: {
        type: 'array',
        items: { $ref: '#/components/schemas/RecentExerciseItemSwaggerDTO' }
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
    },
    description: 'Dữ liệu danh sách Exercise gần đây và phân trang'
  })
  data: {
    results: RecentExerciseItemSwaggerDTO[]
    pagination: {
      current: number
      pageSize: number
      totalPage: number
      totalItem: number
    }
  }

  @ApiProperty({
    example: 'Lấy danh sách bài exercise gần đây thành công',
    description: 'Thông báo'
  })
  message: string
}

export class HistoryTestItemSwaggerDTO {
  @ApiProperty({ example: 42, description: 'ID của lần attempt' })
  attemptId: number

  @ApiProperty({ example: 5, description: 'ID của bài test' })
  testId: number

  @ApiPropertyOptional({
    enum: TestStatus,
    example: TestStatus.REVIEW_TEST,
    description: 'Loại bài test'
  })
  testType?: TestStatus | null

  @ApiPropertyOptional({ example: 'Kiểm tra từ vựng N3', description: 'Tên bài test' })
  testName?: string | null

  @ApiProperty({ example: 'COMPLETED', description: 'Trạng thái' })
  status: string

  @ApiPropertyOptional({ example: 80, description: 'Điểm số (%)' })
  score?: number | null

  @ApiProperty({ example: 20, description: 'Tổng số câu hỏi' })
  totalQuestions: number

  @ApiProperty({ example: 16, description: 'Số câu trả lời đúng' })
  correctAnswers: number

  @ApiProperty({ example: 4, description: 'Số câu trả lời sai' })
  incorrectAnswers: number

  @ApiProperty({ example: '2024-01-01T10:20:00.000Z', description: 'Thời gian cập nhật' })
  updatedAt: Date
}

export class HistoryTestsResponseSwaggerDTO {
  @ApiProperty({ example: 200, description: 'Mã trạng thái HTTP' })
  statusCode: number

  @ApiProperty({
    type: 'object',
    properties: {
      results: {
        type: 'array',
        items: { $ref: '#/components/schemas/HistoryTestItemSwaggerDTO' }
      },
      allTime: {
        type: 'number',
        example: 3600,
        description: 'Tổng thời gian của tất cả attempts (giây)'
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
    },
    description: 'Dữ liệu danh sách Test đã làm và phân trang'
  })
  data: {
    results: HistoryTestItemSwaggerDTO[]
    allTime: number
    pagination: {
      current: number
      pageSize: number
      totalPage: number
      totalItem: number
    }
  }

  @ApiProperty({
    example: 'Lấy danh sách bài test gần đây thành công',
    description: 'Thông báo'
  })
  message: string
}
