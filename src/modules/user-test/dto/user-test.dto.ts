import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { TestSetStatus, TestStatus } from '@prisma/client'

export class UserTestSwaggerDTO {
  @ApiProperty({ example: 1, description: 'ID của UserTest' })
  id: number

  @ApiProperty({ example: 1, description: 'ID người dùng' })
  userId: number

  @ApiProperty({ example: 1, description: 'ID bài test' })
  testId: number

  @ApiProperty({
    example: 'ACTIVE',
    description: 'Trạng thái',
    enum: ['NOT_STARTED', 'ACTIVE']
  })
  status: string

  @ApiProperty({
    example: 0,
    description: 'Giới hạn số lần làm bài test (0 = không giới hạn)',
    required: false
  })
  limit?: number | null

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Ngày tạo' })
  createdAt: Date

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Ngày cập nhật' })
  updatedAt: Date
}

// DTO cho TestInfo trong UserTest response
export class TestInfoSwaggerDTO {
  @ApiProperty({ example: 1, description: 'ID của bài test' })
  id: number

  @ApiProperty({
    example: 'Kiểm tra đầu vào N3',
    description: 'Tên bài test'
  })
  name: string

  @ApiPropertyOptional({
    example: 'Bài kiểm tra đầu vào để đánh giá trình độ N3 trong tiếng Nhật',
    description: 'Mô tả bài test'
  })
  description?: string

  @ApiPropertyOptional({ example: 0, description: 'Giá bài test (VND)' })
  price?: number

  @ApiPropertyOptional({ example: 0, description: 'Cấp độ JLPT (0-5), 0 = nhiều cấp độ' })
  levelN?: number

  @ApiProperty({
    enum: TestStatus,
    example: TestStatus.PLACEMENT_TEST_DONE,
    description: 'Loại đề thi'
  })
  testType: TestStatus

  @ApiProperty({
    enum: TestSetStatus,
    example: TestSetStatus.ACTIVE,
    description: 'Trạng thái bài test'
  })
  status: TestSetStatus

  @ApiProperty({
    example: 1,
    description: 'Giới hạn số lần làm bài test (0 = không giới hạn)'
  })
  limit: number
}

// DTO cho UserTest với TestInfo (không có testId, createdAt, updatedAt)
export class UserTestWithTestSwaggerDTO {
  @ApiProperty({ example: 1, description: 'ID của UserTest' })
  id: number

  @ApiProperty({ example: 1, description: 'ID người dùng' })
  userId: number

  @ApiProperty({
    example: 'ACTIVE',
    description: 'Trạng thái',
    enum: ['NOT_STARTED', 'ACTIVE']
  })
  status: string

  @ApiProperty({
    example: 1,
    description: 'Giới hạn số lần làm bài test (0 = không giới hạn)',
    required: false
  })
  limit?: number | null

  @ApiProperty({ type: TestInfoSwaggerDTO, description: 'Thông tin bài test' })
  test: TestInfoSwaggerDTO
}

export class CreateUserTestSwaggerDTO {
  @ApiProperty({ example: 1, description: 'ID người dùng' })
  userId: number

  @ApiProperty({ example: 1, description: 'ID bài test' })
  testId: number

  @ApiProperty({
    example: 'ACTIVE',
    description: 'Trạng thái',
    enum: ['NOT_STARTED', 'ACTIVE'],
    required: false
  })
  status?: string

  @ApiProperty({
    example: 0,
    description: 'Giới hạn số lần làm bài test (0 = không giới hạn)',
    required: false
  })
  limit?: number | null
}

export class UpdateUserTestSwaggerDTO {
  @ApiProperty({
    example: 'ACTIVE',
    description: 'Trạng thái',
    enum: ['NOT_STARTED', 'ACTIVE'],
    required: false
  })
  status?: string

  @ApiProperty({
    example: 0,
    description: 'Giới hạn số lần làm bài test (0 = không giới hạn)',
    required: false
  })
  limit?: number | null
}

export class GetUserTestListQuerySwaggerDTO {
  @ApiProperty({ example: '1', description: 'Trang hiện tại', required: false })
  currentPage?: string

  @ApiProperty({ example: '10', description: 'Số lượng mục mỗi trang', required: false })
  pageSize?: string

  @ApiProperty({ example: '1', description: 'ID người dùng', required: false })
  userId?: string

  @ApiProperty({ example: '1', description: 'ID bài test', required: false })
  testId?: string

  @ApiProperty({
    example: 'ACTIVE',
    description: 'Trạng thái',
    enum: ['NOT_STARTED', 'ACTIVE'],
    required: false
  })
  status?: string

  @ApiProperty({
    enum: TestStatus,
    example: TestStatus.PLACEMENT_TEST_DONE,
    description: 'Lọc theo loại test',
    required: false
  })
  testType?: TestStatus
}

export class GetUserTestMyListQuerySwaggerDTO {
  @ApiProperty({ example: '1', description: 'Trang hiện tại', required: false })
  currentPage?: string

  @ApiProperty({ example: '10', description: 'Số lượng mục mỗi trang', required: false })
  pageSize?: string

  @ApiProperty({ example: '1', description: 'ID bài test', required: false })
  testId?: string

  @ApiProperty({
    example: 'ACTIVE',
    description: 'Trạng thái',
    enum: ['NOT_STARTED', 'ACTIVE'],
    required: false
  })
  status?: string

  @ApiProperty({
    enum: TestStatus,
    example: TestStatus.PLACEMENT_TEST_DONE,
    description: 'Lọc theo loại test (type của test)',
    required: false
  })
  type?: TestStatus
}

export class UserTestResponseSwaggerDTO {
  @ApiProperty({ example: 200, description: 'Mã trạng thái HTTP' })
  statusCode: number

  @ApiProperty({ type: UserTestSwaggerDTO, description: 'Dữ liệu UserTest' })
  data: UserTestSwaggerDTO

  @ApiProperty({ example: 'Lấy thông tin UserTest thành công', description: 'Thông báo' })
  message: string
}

export class UserTestListResponseSwaggerDTO {
  @ApiProperty({ example: 200, description: 'Mã trạng thái HTTP' })
  statusCode: number

  @ApiProperty({
    type: 'object',
    properties: {
      results: {
        type: 'array',
        items: { $ref: '#/components/schemas/UserTestSwaggerDTO' }
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
    description: 'Dữ liệu danh sách UserTest và phân trang'
  })
  data: {
    results: UserTestSwaggerDTO[]
    pagination: {
      current: number
      pageSize: number
      totalPage: number
      totalItem: number
    }
  }

  @ApiProperty({ example: 'Lấy danh sách UserTest thành công', description: 'Thông báo' })
  message: string
}

// Nested class cho pagination
class PaginationSwaggerDTO {
  @ApiProperty({ example: 1, description: 'Trang hiện tại' })
  current: number

  @ApiProperty({ example: 10, description: 'Số lượng mỗi trang' })
  pageSize: number

  @ApiProperty({ example: 5, description: 'Tổng số trang' })
  totalPage: number

  @ApiProperty({ example: 50, description: 'Tổng số item' })
  totalItem: number
}

// Nested class cho data property
class UserTestMyListDataSwaggerDTO {
  @ApiProperty({
    type: [UserTestWithTestSwaggerDTO],
    description: 'Danh sách UserTest với thông tin Test'
  })
  results: UserTestWithTestSwaggerDTO[]

  @ApiProperty({ type: PaginationSwaggerDTO, description: 'Thông tin phân trang' })
  pagination: PaginationSwaggerDTO
}

export class UserTestMyListResponseSwaggerDTO {
  @ApiProperty({ example: 200, description: 'Mã trạng thái HTTP' })
  statusCode: number

  @ApiProperty({
    type: UserTestMyListDataSwaggerDTO,
    description: 'Dữ liệu danh sách UserTest với thông tin Test và phân trang'
  })
  data: UserTestMyListDataSwaggerDTO

  @ApiProperty({ example: 'Lấy danh sách UserTest thành công', description: 'Thông báo' })
  message: string
}
