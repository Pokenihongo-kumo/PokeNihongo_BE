import { ApiProperty } from '@nestjs/swagger'

// Swagger DTOs for API documentation
export class CreateLanguagesSwaggerDTO {
  @ApiProperty({
    example: 'vi',
    description: 'Mã ngôn ngữ (ISO 639-1/639-2)',
    minLength: 2,
    maxLength: 10
  })
  code: string

  @ApiProperty({
    example: 'Vietnamese',
    description: 'Tên ngôn ngữ',
    minLength: 1,
    maxLength: 100
  })
  name: string
}

export class UpdateLanguagesSwaggerDTO {
  @ApiProperty({
    example: 'vi',
    description: 'Mã ngôn ngữ (ISO 639-1/639-2)',
    required: false,
    minLength: 2,
    maxLength: 10
  })
  code?: string

  @ApiProperty({
    example: 'Vietnamese',
    description: 'Tên ngôn ngữ',
    required: false,
    minLength: 1,
    maxLength: 100
  })
  name?: string
}

export class LanguagesSwaggerResponseDTO {
  @ApiProperty({ example: 1, description: 'ID của ngôn ngữ' })
  id: number

  @ApiProperty({ example: 'vi', description: 'Mã ngôn ngữ' })
  code: string

  @ApiProperty({ example: 'Vietnamese', description: 'Tên ngôn ngữ' })
  name: string

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

export class GetLanguagesListQuerySwaggerDTO {
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
    description: 'Số lượng ngôn ngữ mỗi trang',
    required: false,
    default: 10,
    minimum: 1,
    maximum: 100
  })
  pageSize?: number

  @ApiProperty({
    example: 'vi',
    description: 'Tìm kiếm theo mã ngôn ngữ',
    required: false,
    maxLength: 10
  })
  code?: string

  @ApiProperty({
    example: 'Vietnamese',
    description: 'Tìm kiếm theo tên ngôn ngữ',
    required: false,
    maxLength: 100
  })
  name?: string

  @ApiProperty({
    example: 'vi',
    description: 'Từ khóa tìm kiếm (có thể tìm theo mã hoặc tên ngôn ngữ)',
    required: false,
    maxLength: 100
  })
  search?: string
}

export class LanguagesListSwaggerResponseDTO {
  @ApiProperty({ example: 200, description: 'Mã trạng thái HTTP' })
  statusCode: number

  @ApiProperty({ example: 'Lấy danh sách ngôn ngữ thành công', description: 'Thông báo' })
  message: string

  @ApiProperty({
    type: 'object',
    description: 'Dữ liệu trả về',
    properties: {
      results: {
        type: 'array',
        items: { $ref: '#/components/schemas/LanguagesSwaggerResponseDTO' },
        description: 'Danh sách ngôn ngữ'
      },
      pagination: {
        type: 'object',
        properties: {
          current: { type: 'number', example: 1, description: 'Trang hiện tại' },
          pageSize: { type: 'number', example: 10, description: 'Số ngôn ngữ mỗi trang' },
          totalPage: { type: 'number', example: 1, description: 'Tổng số trang' },
          totalItem: { type: 'number', example: 10, description: 'Tổng số ngôn ngữ' }
        }
      }
    }
  })
  data: {
    results: LanguagesSwaggerResponseDTO[]
    pagination: {
      current: number
      pageSize: number
      totalPage: number
      totalItem: number
    }
  }
}

// Export Zod DTOs
export {
  CreateLanguagesBodyDTO,
  UpdateLanguagesBodyDTO,
  GetLanguagesByIdParamsDTO,
  GetLanguagesListQueryDTO,
  GetLanguagesByCodeParamsDTO,
  LanguagesResDTO,
  LanguagesListResDTO
} from './languages.zod-dto'
