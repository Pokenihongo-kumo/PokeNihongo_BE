import { ApiProperty } from '@nestjs/swagger'
import { GrammarSortField, SortOrder } from '@/common/enum/enum'

export class GrammarResponseSwaggerDTO {
  @ApiProperty({
    example: 1,
    description: 'ID của ngữ pháp'
  })
  id: number

  @ApiProperty({
    example: '〜です',
    description: 'Cấu trúc ngữ pháp'
  })
  structure: string

  @ApiProperty({
    example: 'N5',
    description: 'Cấp độ JLPT (N5, N4, N3, N2, N1)'
  })
  level: string

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

export class GrammarPaginationSwaggerDTO {
  @ApiProperty({
    example: 1,
    description: 'Trang hiện tại'
  })
  current: number

  @ApiProperty({
    example: 10,
    description: 'Số lượng ngữ pháp mỗi trang'
  })
  pageSize: number

  @ApiProperty({
    example: 1,
    description: 'Tổng số trang'
  })
  totalPage: number

  @ApiProperty({
    example: 100,
    description: 'Tổng số ngữ pháp'
  })
  totalItem: number
}

export class GrammarListResponseSwaggerDTO {
  @ApiProperty({
    example: 200,
    description: 'Mã trạng thái'
  })
  statusCode: number

  @ApiProperty({
    description: 'Dữ liệu danh sách ngữ pháp'
  })
  data: {
    results: GrammarResponseSwaggerDTO[]
    pagination: GrammarPaginationSwaggerDTO
  }

  @ApiProperty({
    example: 'Lấy danh sách ngữ pháp thành công',
    description: 'Thông báo'
  })
  message: string
}

export class CreateGrammarSwaggerDTO {
  @ApiProperty({
    example: '〜です',
    description: 'Cấu trúc ngữ pháp'
  })
  structure: string

  @ApiProperty({
    example: 'N5',
    description: 'Cấp độ JLPT (N5, N4, N3, N2, N1)'
  })
  level: string

  @ApiProperty({
    description: 'Thông tin cách sử dụng ngữ pháp',
    required: false,
    example: {
      exampleSentenceJp: '私は学生です。'
    }
  })
  usage?: {
    exampleSentenceJp: string
  }

  @ApiProperty({
    description: 'Bản dịch cho cách sử dụng ngữ pháp',
    required: false,
    example: {
      usage: [
        {
          language_code: 'vi',
          explanation: 'Giải thích cách sử dụng',
          example: 'Tôi là học sinh.'
        },
        {
          language_code: 'en',
          explanation: 'Usage explanation',
          example: 'I am a student.'
        }
      ]
    }
  })
  translations?: {
    usage?: Array<{ language_code: string; explanation: string; example: string }>
  }
}

export class UpdateGrammarSwaggerDTO {
  @ApiProperty({
    example: '〜です',
    description: 'Cấu trúc ngữ pháp',
    required: false
  })
  structure?: string

  @ApiProperty({
    example: 'N5',
    description: 'Cấp độ JLPT (N5, N4, N3, N2, N1)',
    required: false
  })
  level?: string
}

export class GetGrammarListQuerySwaggerDTO {
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
    description: 'Số lượng ngữ pháp mỗi trang',
    required: false,
    default: 10,
    minimum: 1,
    maximum: 100
  })
  pageSize?: number

  @ApiProperty({
    example: 'N5',
    description: 'Lọc theo cấp độ JLPT',
    required: false
  })
  level?: string

  @ApiProperty({
    example: 'です',
    description: 'Tìm kiếm theo cấu trúc ngữ pháp',
    required: false
  })
  search?: string

  @ApiProperty({
    example: 1,
    description: 'ID của lesson để loại bỏ grammar đã có trong lesson đó',
    required: false,
    minimum: 1
  })
  lessonId?: number

  @ApiProperty({
    enum: GrammarSortField,
    example: GrammarSortField.CREATED_AT,
    description: 'Field để sắp xếp theo structure, level, createdAt, updatedAt',
    required: false
  })
  sortBy?: GrammarSortField

  @ApiProperty({
    enum: SortOrder,
    example: SortOrder.DESC,
    description: 'Sắp xếp theo thứ tự tăng dần (asc) hoặc giảm dần (desc)',
    required: false
  })
  sort?: SortOrder
}
