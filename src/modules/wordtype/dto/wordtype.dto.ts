import { ApiProperty } from '@nestjs/swagger'

// Swagger DTOs for API documentation. They mirror the Zod schemas in
// entities/wordtype.entity.ts and the envelope the API really returns.
const NAME_KEY = {
  example: 'wordtype.noun.name',
  description: 'Translation key of the word type name',
  minLength: 1,
  maxLength: 100
}

export class CreateWordTypeSwaggerDTO {
  @ApiProperty({ example: 1, description: 'Optional explicit ID', required: false })
  id?: number

  @ApiProperty(NAME_KEY)
  nameKey: string
}

export class UpdateWordTypeSwaggerDTO {
  @ApiProperty({ ...NAME_KEY, required: false })
  nameKey?: string
}

export class WordTypeSwaggerDTO {
  @ApiProperty({ example: 1, description: 'ID của loại từ' })
  id: number

  @ApiProperty({ example: 'wordtype.noun.name', description: 'Key để dịch tên loại từ' })
  nameKey: string

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Thời gian tạo' })
  createdAt: Date

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Thời gian cập nhật' })
  updatedAt: Date
}

export class WordTypeSwaggerResponseDTO {
  @ApiProperty({ example: 200 })
  statusCode: number

  @ApiProperty({ example: 'Lấy loại từ thành công' })
  message: string

  @ApiProperty({ type: WordTypeSwaggerDTO })
  data: WordTypeSwaggerDTO
}

// List items expose the translated name instead of nameKey (WordTypeViewSchema)
export class WordTypeListItemSwaggerDTO {
  @ApiProperty({ example: 1 })
  id: number

  @ApiProperty({ example: 'Danh từ', description: 'Tên đã dịch theo Accept-Language' })
  name: string

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updatedAt: Date
}

export class PaginationSwaggerDTO {
  @ApiProperty({ example: 1 })
  current: number

  @ApiProperty({ example: 10 })
  pageSize: number

  @ApiProperty({ example: 1 })
  totalPage: number

  @ApiProperty({ example: 10 })
  totalItem: number
}

export class WordTypeListDataSwaggerDTO {
  @ApiProperty({ type: [WordTypeListItemSwaggerDTO] })
  results: WordTypeListItemSwaggerDTO[]

  @ApiProperty({ type: PaginationSwaggerDTO })
  pagination: PaginationSwaggerDTO
}

export class WordTypeListSwaggerResponseDTO {
  @ApiProperty({ example: 200 })
  statusCode: number

  @ApiProperty({ example: 'Lấy danh sách loại từ thành công' })
  message: string

  @ApiProperty({ type: WordTypeListDataSwaggerDTO })
  data: WordTypeListDataSwaggerDTO
}

// Export Zod DTOs
export {
  CreateWordTypeBodyDTO,
  UpdateWordTypeBodyDTO,
  GetWordTypeByIdParamsDTO,
  GetWordTypeListQueryDTO,
  GetWordTypeByNameKeyParamsDTO,
  WordTypeResDTO,
  WordTypeListResDTO
} from './wordtype.zod-dto'

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
