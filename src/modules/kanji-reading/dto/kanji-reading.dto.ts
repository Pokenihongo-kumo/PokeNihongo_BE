import { ApiProperty } from '@nestjs/swagger'
import { KanjiReadingSortField, SortOrder } from '@/common/enum/enum'

// Swagger DTOs for API documentation
export class CreateKanjiReadingSwaggerDTO {
  @ApiProperty({
    example: 1,
    description: 'ID của Kanji',
    minimum: 1
  })
  kanjiId: number

  @ApiProperty({
    example: 'onyomi',
    description: 'Loại cách đọc (onyomi, kunyomi, nanori, irregular)',
    minLength: 1,
    maxLength: 20
  })
  readingType: string

  @ApiProperty({
    example: 'にち',
    description: 'Cách đọc cụ thể',
    minLength: 1,
    maxLength: 100
  })
  reading: string
}

export class UpdateKanjiReadingSwaggerDTO {
  @ApiProperty({
    example: 'onyomi',
    description: 'Loại cách đọc (onyomi, kunyomi, nanori, irregular)',
    minLength: 1,
    maxLength: 20,
    required: false
  })
  readingType?: string

  @ApiProperty({
    example: 'にち',
    description: 'Cách đọc cụ thể',
    minLength: 1,
    maxLength: 100,
    required: false
  })
  reading?: string
}

export class KanjiReadingSwaggerResponseDTO {
  @ApiProperty({ example: 1, description: 'ID của cách đọc' })
  id: number

  @ApiProperty({ example: 1, description: 'ID của Kanji' })
  kanjiId: number

  @ApiProperty({ example: 'onyomi', description: 'Loại cách đọc' })
  readingType: string

  @ApiProperty({ example: 'にち', description: 'Cách đọc' })
  reading: string

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

export class KanjiReadingListSwaggerResponseDTO {
  @ApiProperty({
    type: [KanjiReadingSwaggerResponseDTO],
    description: 'Danh sách cách đọc'
  })
  data: KanjiReadingSwaggerResponseDTO[]

  @ApiProperty({ example: 10, description: 'Tổng số cách đọc' })
  total: number

  @ApiProperty({ example: 1, description: 'Trang hiện tại' })
  page: number

  @ApiProperty({ example: 10, description: 'Số cách đọc mỗi trang' })
  limit: number

  @ApiProperty({ example: 1, description: 'Tổng số trang' })
  totalPages: number
}

// Query parameter DTOs
export class GetKanjiReadingListQuerySwaggerDTO {
  @ApiProperty({ example: 1, description: 'Số trang hiện tại', required: false })
  currentPage?: number

  @ApiProperty({ example: 10, description: 'Số item mỗi trang', required: false })
  pageSize?: number

  @ApiProperty({
    example: 'にち',
    description: 'Tìm kiếm theo cách đọc',
    required: false
  })
  search?: string

  @ApiProperty({ example: 1, description: 'Lọc theo ID Kanji', required: false })
  kanjiId?: number

  @ApiProperty({
    example: 'onyomi',
    description: 'Lọc theo loại cách đọc',
    required: false
  })
  readingType?: string

  @ApiProperty({
    enum: KanjiReadingSortField,
    example: KanjiReadingSortField.CREATED_AT,
    description:
      'Field để sắp xếp theo id, kanjiId, readingType, reading, createdAt, updatedAt',
    required: false
  })
  sortBy?: KanjiReadingSortField

  @ApiProperty({
    enum: SortOrder,
    example: SortOrder.DESC,
    description: 'Sắp xếp theo thứ tự tăng dần (asc) hoặc giảm dần (desc)',
    required: false
  })
  sort?: SortOrder
}
