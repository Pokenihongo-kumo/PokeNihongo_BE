import { ApiProperty } from '@nestjs/swagger'

// Swagger DTOs for API documentation
export class CreateWordTypeSwaggerDTO {
  @ApiProperty({
    example: 'noun',
    description: 'Tag để phân loại (noun, verb, adjective, etc.)',
    minLength: 1,
    maxLength: 50
  })
  tag: string
}

export class UpdateWordTypeSwaggerDTO {
  @ApiProperty({
    example: 'noun',
    description: 'Tag để phân loại (noun, verb, adjective, etc.)',
    minLength: 1,
    maxLength: 50,
    required: false
  })
  tag?: string
}

export class WordTypeSwaggerResponseDTO {
  @ApiProperty({ example: 1, description: 'ID của loại từ' })
  id: number

  @ApiProperty({
    example: 'wordtype.noun.name',
    description: 'Key để dịch tên loại từ'
  })
  nameKey: string

  @ApiProperty({
    example: 'noun',
    description: 'Tag để phân loại'
  })
  tag?: string

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

export class WordTypeListSwaggerResponseDTO {
  @ApiProperty({ type: [WordTypeSwaggerResponseDTO], description: 'Danh sách loại từ' })
  data: WordTypeSwaggerResponseDTO[]

  @ApiProperty({ example: 10, description: 'Tổng số loại từ' })
  total: number

  @ApiProperty({ example: 1, description: 'Trang hiện tại' })
  page: number

  @ApiProperty({ example: 10, description: 'Số loại từ mỗi trang' })
  limit: number

  @ApiProperty({ example: 1, description: 'Tổng số trang' })
  totalPages: number
}

// Export Zod DTOs
export {
  CreateWordTypeBodyDTO,
  UpdateWordTypeBodyDTO,
  GetWordTypeByIdParamsDTO,
  GetWordTypeListQueryDTO,
  GetWordTypeByNameKeyParamsDTO,
  WordTypeResponseDTO,
  WordTypeListResDTO
} from './zod/wordtype-zod.dto'

// Query Swagger DTO
export class GetWordTypeListQuerySwaggerDTO {
  @ApiProperty({ example: 1, description: 'Số trang hiện tại', required: false })
  page?: number

  @ApiProperty({
    example: 10,
    description: 'Số lượng loại từ mỗi trang',
    required: false
  })
  limit?: number

  @ApiProperty({
    enum: ['id', 'nameKey', 'createdAt', 'updatedAt'],
    example: 'createdAt',
    description: 'Field để sắp xếp: id | nameKey | createdAt | updatedAt',
    required: false
  })
  sortBy?: 'id' | 'nameKey' | 'createdAt' | 'updatedAt'

  @ApiProperty({
    enum: ['asc', 'desc'],
    example: 'desc',
    description: 'Thứ tự sắp xếp: asc hoặc desc',
    required: false
  })
  sortOrder?: 'asc' | 'desc'
}

// List Response DTO (not Zod)
export class WordTypeListResponseDTO {
  data: any[]
  total: number
  page: number
  limit: number
  totalPages: number
}
