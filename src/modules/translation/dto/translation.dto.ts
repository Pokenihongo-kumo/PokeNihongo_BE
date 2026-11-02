import { ApiProperty } from '@nestjs/swagger'
import { TranslationSortField, SortOrder } from '@/common/enum/enum'

// Export Zod DTOs from subfolder
export {
  CreateTranslationBodyDTO,
  UpdateTranslationBodyDTO,
  GetTranslationByIdParamsDTO,
  GetTranslationListQueryDTO,
  GetTranslationsByKeyQueryDTO,
  GetTranslationsByLanguageQueryDTO,
  TranslationResponseDTO,
  TranslationListResponseDTO,
  TranslationResDTO,
  TranslationListResDTO
} from './zod/translation.zod-dto'

// Swagger DTOs - for API documentation only
export class CreateTranslationSwaggerDTO {
  @ApiProperty({ example: 'vi', description: 'Mã ngôn ngữ' })
  languageCode: string

  @ApiProperty({ example: 'lesson.1.title', description: 'Key dịch' })
  key: string

  @ApiProperty({ example: 'Bài học 1', description: 'Nội dung dịch' })
  value: string
}

export class UpdateTranslationSwaggerDTO {
  @ApiProperty({ example: 'vi', description: 'Mã ngôn ngữ', required: false })
  languageCode?: string

  @ApiProperty({ example: 'lesson.1.title', description: 'Key dịch', required: false })
  key?: string

  @ApiProperty({ example: 'Bài học 1', description: 'Nội dung dịch', required: false })
  value?: string
}

export class TranslationSwaggerResponseDTO {
  @ApiProperty({ example: 1, description: 'ID bản dịch' })
  id: number

  @ApiProperty({ example: 'vi', description: 'Mã ngôn ngữ' })
  languageCode: string

  @ApiProperty({ example: 'lesson.1.title', description: 'Key dịch' })
  key: string

  @ApiProperty({ example: 'Bài học 1', description: 'Nội dung dịch' })
  value: string

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Ngày tạo' })
  createdAt: Date

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Ngày cập nhật' })
  updatedAt: Date
}

export class TranslationListSwaggerResponseDTO {
  @ApiProperty({
    type: [TranslationSwaggerResponseDTO],
    description: 'Danh sách bản dịch'
  })
  data: TranslationSwaggerResponseDTO[]

  @ApiProperty({ example: 100, description: 'Tổng số bản dịch' })
  total: number

  @ApiProperty({ example: 1, description: 'Trang hiện tại' })
  page: number

  @ApiProperty({ example: 10, description: 'Số bản dịch mỗi trang' })
  limit: number

  @ApiProperty({ example: 10, description: 'Tổng số trang' })
  totalPages: number
}

export class TranslationByKeySwaggerResponseDTO {
  @ApiProperty({ example: 'lesson.1.title', description: 'Key dịch' })
  key: string

  @ApiProperty({
    example: { vi: 'Bài học 1', en: 'Lesson 1' },
    description: 'Các bản dịch theo ngôn ngữ'
  })
  translations: Record<string, string>
}

// Query parameter DTOs
export class GetTranslationListQuerySwaggerDTO {
  @ApiProperty({ example: 1, description: 'Số trang hiện tại', required: false })
  currentPage?: number

  @ApiProperty({ example: 10, description: 'Số item mỗi trang', required: false })
  pageSize?: number

  @ApiProperty({
    example: 'lesson',
    description: 'Tìm kiếm theo key hoặc value',
    required: false
  })
  search?: string

  @ApiProperty({ example: 1, description: 'Lọc theo ID ngôn ngữ', required: false })
  languageId?: number

  @ApiProperty({
    example: 'lesson.1.title',
    description: 'Lọc theo key cụ thể',
    required: false
  })
  key?: string

  @ApiProperty({
    enum: TranslationSortField,
    example: TranslationSortField.CREATED_AT,
    description: 'Field để sắp xếp theo id, languageId, key, value, createdAt, updatedAt',
    required: false
  })
  sortBy?: TranslationSortField

  @ApiProperty({
    enum: SortOrder,
    example: SortOrder.DESC,
    description: 'Sắp xếp theo thứ tự tăng dần (asc) hoặc giảm dần (desc)',
    required: false
  })
  sort?: SortOrder
}

// Export for controller (aliases for backward compatibility)
export { TranslationByKeySwaggerResponseDTO as TranslationByKeyResponseDTO }
