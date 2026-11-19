import { ApiProperty } from '@nestjs/swagger'

export class UserProgressSwaggerDTO {
  @ApiProperty({ example: 1, description: 'ID của tiến độ học tập' })
  id: number

  @ApiProperty({ example: 1, description: 'ID người dùng' })
  userId: number

  @ApiProperty({ example: 1, description: 'ID bài học' })
  lessonId: number

  @ApiProperty({
    example: 'IN_PROGRESS',
    description: 'Trạng thái tiến độ',
    enum: ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED']
  })
  status: string

  @ApiProperty({ example: 50, description: 'Phần trăm hoàn thành (0-100)' })
  progressPercentage: number

  @ApiProperty({
    example: '2024-01-01T00:00:00.000Z',
    description: 'Thời điểm hoàn thành',
    required: false
  })
  completedAt?: Date

  @ApiProperty({
    example: '2024-01-01T00:00:00.000Z',
    description: 'Thời điểm truy cập cuối'
  })
  lastAccessedAt: Date

  @ApiProperty({
    example: 1,
    description: 'ID của test (LESSON_REVIEW)',
    required: false,
    nullable: true
  })
  testId?: number | null

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Ngày tạo' })
  createdAt: Date

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Ngày cập nhật' })
  updatedAt: Date
}

export class CreateUserProgressSwaggerDTO {
  @ApiProperty({ example: 1, description: 'ID người dùng' })
  userId: number

  @ApiProperty({ example: 1, description: 'ID bài học' })
  lessonId: number

  @ApiProperty({
    example: 'NOT_STARTED',
    description: 'Trạng thái tiến độ',
    enum: ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'],
    required: false
  })
  status?: string

  @ApiProperty({
    example: 0,
    description: 'Phần trăm hoàn thành (0-100)',
    required: false
  })
  progressPercentage?: number
}

export class UpdateUserProgressSwaggerDTO {
  @ApiProperty({
    example: 'IN_PROGRESS',
    description: 'Trạng thái tiến độ',
    enum: ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'],
    required: false
  })
  status?: string

  @ApiProperty({
    example: 50,
    description: 'Phần trăm hoàn thành (0-100)',
    required: false
  })
  progressPercentage?: number

  @ApiProperty({ example: 1800, description: 'Thời gian học (giây)', required: false })
  timeSpent?: number

  @ApiProperty({ example: 85, description: 'Điểm số', required: false })
  score?: number

  @ApiProperty({ example: 'Ghi chú của user', description: 'Ghi chú', required: false })
  notes?: string
}

export class UserProgressResponseSwaggerDTO {
  @ApiProperty({ type: UserProgressSwaggerDTO, description: 'Dữ liệu tiến độ học tập' })
  data: UserProgressSwaggerDTO

  @ApiProperty({
    example: 'Lấy thông tin tiến độ học tập thành công',
    description: 'Thông báo'
  })
  message: string
}

export class UserProgressListResponseSwaggerDTO {
  @ApiProperty({ example: 200, description: 'Status code' })
  statusCode: number

  @ApiProperty({
    description: 'Dữ liệu danh sách tiến độ học tập',
    properties: {
      results: {
        type: 'array',
        items: { $ref: '#/components/schemas/UserProgressSwaggerDTO' }
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
    results: UserProgressSwaggerDTO[]
    pagination: {
      current: number
      pageSize: number
      totalPage: number
      totalItem: number
    }
  }

  @ApiProperty({
    example: 'Lấy danh sách tiến độ học tập thành công',
    description: 'Thông báo'
  })
  message: string
}

export class GetUserProgressListQuerySwaggerDTO {
  @ApiProperty({ example: 1, description: 'Trang hiện tại', required: false })
  currentPage?: number

  @ApiProperty({ example: 10, description: 'Số bản ghi mỗi trang', required: false })
  pageSize?: number

  @ApiProperty({ example: 1, description: 'ID bài học', required: false })
  lessonId?: number

  @ApiProperty({ example: 1, description: 'ID danh mục bài học', required: false })
  lessonCategoryId?: number

  @ApiProperty({
    example: 'IN_PROGRESS',
    description: 'Trạng thái tiến độ',
    enum: ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'],
    required: false
  })
  status?: string

  @ApiProperty({ example: 50, description: 'Phần trăm hoàn thành', required: false })
  progressPercentage?: number
}

// Admin API DTOs
export class InitUserProgressForAdminResponseSwaggerDTO {
  @ApiProperty({ example: 1, description: 'ID người dùng' })
  userId: number

  @ApiProperty({ example: 50, description: 'Tổng số lesson' })
  totalLessons: number

  @ApiProperty({ example: 50, description: 'Số UserProgress đã tạo' })
  createdProgress: number
}

export class InitAllUsersProgressResponseSwaggerDTO {
  @ApiProperty({ example: 100, description: 'Tổng số user' })
  totalUsers: number

  @ApiProperty({ example: 50, description: 'Tổng số lesson' })
  totalLessons: number

  @ApiProperty({ example: 5000, description: 'Tổng số UserProgress đã tạo' })
  totalCreatedProgress: number

  @ApiProperty({
    example: [1, 2, 3, 4, 5],
    description: 'Danh sách ID user đã xử lý',
    type: [Number]
  })
  processedUsers: number[]
}
