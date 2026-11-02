import { ApiProperty } from '@nestjs/swagger'

// Export Zod DTOs from subfolder
export {
  CreateKanjiBodyDTO,
  UpdateKanjiBodyDTO,
  GetKanjiByIdParamsDTO,
  GetKanjiListQueryDTO,
  KanjiResponseDTO,
  KanjiListResponseDTO,
  KanjiResDTO,
  KanjiListResDTO
} from './zod/kanji.zod-dto'

// Swagger DTOs - for API documentation only
export class CreateKanjiSwaggerDTO {
  @ApiProperty({ example: '日', description: 'Ký tự Kanji' })
  character: string

  @ApiProperty({ example: 'kanji.sun.meaning', description: 'Key dịch nghĩa Kanji' })
  meaningKey: string

  @ApiProperty({ example: 8, description: 'Số nét viết', required: false })
  strokeCount?: number

  @ApiProperty({ example: 5, description: 'Cấp độ JLPT (N5-N1)', required: false })
  jlptLevel?: number
}

export class UpdateKanjiSwaggerDTO {
  @ApiProperty({ example: '日', description: 'Ký tự Kanji', required: false })
  character?: string

  @ApiProperty({
    example: 'kanji.sun.meaning',
    description: 'Key dịch nghĩa Kanji',
    required: false
  })
  meaningKey?: string

  @ApiProperty({ example: 8, description: 'Số nét viết', required: false })
  strokeCount?: number

  @ApiProperty({ example: 5, description: 'Cấp độ JLPT (N5-N1)', required: false })
  jlptLevel?: number
}

export class KanjiSwaggerResponseDTO {
  @ApiProperty({ example: 1, description: 'ID' })
  id: number

  @ApiProperty({ example: '日', description: 'Ký tự Kanji' })
  character: string

  @ApiProperty({ example: 'kanji.sun.meaning', description: 'Key dịch nghĩa Kanji' })
  meaningKey: string

  @ApiProperty({ example: 8, description: 'Số nét viết' })
  strokeCount: number

  @ApiProperty({ example: 5, description: 'Cấp độ JLPT' })
  jlptLevel: number

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Ngày tạo' })
  createdAt: Date

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Ngày cập nhật' })
  updatedAt: Date
}

export class GetKanjiListQuerySwaggerDTO {
  @ApiProperty({ example: 1, description: 'Số trang hiện tại', required: false })
  currentPage?: number

  @ApiProperty({ example: 10, description: 'Số lượng Kanji mỗi trang', required: false })
  pageSize?: number

  @ApiProperty({ example: '日', description: 'Từ khóa tìm kiếm', required: false })
  search?: string

  @ApiProperty({ example: 5, description: 'Lọc theo cấp độ JLPT', required: false })
  jlptLevel?: number

  @ApiProperty({ example: 8, description: 'Lọc theo số nét vẽ', required: false })
  strokeCount?: number

  @ApiProperty({
    example: 1,
    description: 'ID của lesson để loại bỏ kanji đã có trong lesson đó',
    required: false,
    minimum: 1
  })
  lessonId?: number

  @ApiProperty({
    example: 'character',
    description:
      'Sắp xếp theo trường id, character, meaningKey, strokeCount, jlptLevel, createdAt, updatedAt',
    enum: [
      'id',
      'character',
      'meaningKey',
      'strokeCount',
      'jlptLevel',
      'createdAt',
      'updatedAt'
    ],
    required: false
  })
  sortBy?:
    | 'id'
    | 'character'
    | 'meaningKey'
    | 'strokeCount'
    | 'jlptLevel'
    | 'createdAt'
    | 'updatedAt'

  @ApiProperty({
    example: 'asc',
    description: 'Thứ tự sắp xếp asc, desc',
    enum: ['asc', 'desc'],
    required: false
  })
  sortOrder?: 'asc' | 'desc'
}

export class KanjiPaginationSwaggerDTO {
  @ApiProperty({ example: 1, description: 'Trang hiện tại' })
  current: number

  @ApiProperty({ example: 10, description: 'Số Kanji mỗi trang' })
  pageSize: number

  @ApiProperty({ example: 10, description: 'Tổng số trang' })
  totalPage: number

  @ApiProperty({ example: 100, description: 'Tổng số Kanji' })
  totalItem: number
}

export class KanjiListSwaggerResponseDTO {
  @ApiProperty({ example: 200, description: 'Mã trạng thái' })
  statusCode: number

  @ApiProperty({ description: 'Dữ liệu danh sách Kanji' })
  data: {
    results: KanjiSwaggerResponseDTO[]
    pagination: KanjiPaginationSwaggerDTO
  }

  @ApiProperty({ example: 'Lấy danh sách Kanji thành công', description: 'Thông báo' })
  message: string
}

// Import Kanji DTO
export class ImportKanjiSwaggerDTO {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'File Excel với các cột: kanji, mean, detail, kun, on'
  })
  file: any

  @ApiProperty({
    name: 'language',
    required: false,
    type: String,
    description: 'Ngôn ngữ của file (vi hoặc en). Mặc định: vi',
    enum: ['vi', 'en']
  })
  language: string
}
