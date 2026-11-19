import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class LessonCategoryResponseSwaggerDTO {
  @ApiProperty({
    example: 1,
    description: 'ID của danh mục bài học'
  })
  id: number

  @ApiProperty({
    example: 'category.basic-grammar',
    description: 'Key để dịch tên danh mục'
  })
  nameKey: string

  @ApiProperty({
    example: 'basic-grammar',
    description: 'URL slug của danh mục'
  })
  slug: string

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

export class LessonCategoryListResponseSwaggerDTO {
  @ApiProperty({
    type: [LessonCategoryResponseSwaggerDTO],
    description: 'Danh sách danh mục bài học'
  })
  items: LessonCategoryResponseSwaggerDTO[]

  @ApiProperty({
    example: 100,
    description: 'Tổng số danh mục bài học'
  })
  total: number

  @ApiProperty({
    example: 1,
    description: 'Trang hiện tại'
  })
  page: number

  @ApiProperty({
    example: 10,
    description: 'Số lượng danh mục mỗi trang'
  })
  limit: number
}

export class CreateLessonCategorySwaggerDTO {
  @ApiProperty({
    example: 'category.basic-grammar',
    description: 'Key để dịch tên danh mục'
  })
  nameKey: string

  @ApiPropertyOptional({
    example: 'basic-grammar',
    description: 'URL slug của danh mục (tự động tạo nếu không cung cấp)'
  })
  slug?: string
}

export class UpdateLessonCategorySwaggerDTO {
  @ApiProperty({
    example: 'category.basic-grammar',
    description: 'Key để dịch tên danh mục',
    required: false
  })
  nameKey?: string

  @ApiProperty({
    example: 'basic-grammar',
    description: 'URL slug của danh mục',
    required: false
  })
  slug?: string
}

export class GetLessonCategoryListQuerySwaggerDTO {
  @ApiProperty({
    example: 1,
    description: 'Số trang',
    required: false,
    default: 1,
    minimum: 1
  })
  page?: number

  @ApiProperty({
    example: 10,
    description: 'Số lượng danh mục mỗi trang',
    required: false,
    default: 10,
    minimum: 1,
    maximum: 100
  })
  limit?: number

  @ApiProperty({
    example: 'grammar',
    description: 'Từ khóa tìm kiếm',
    required: false,
    maxLength: 100
  })
  search?: string
}
