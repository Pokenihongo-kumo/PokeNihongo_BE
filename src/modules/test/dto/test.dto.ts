import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { TestSetStatus, TestStatus } from '@prisma/client'

export class TestSwaggerDTO {
  @ApiProperty({ example: 1, description: 'ID của bài test' })
  id: number

  @ApiProperty({
    description: 'Tên bài test. Nếu có language: string; nếu không: mảng translations',
    oneOf: [
      { type: 'string', example: 'Kiểm tra đầu vào N3' },
      {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            language: { type: 'string', example: 'vi' },
            value: { type: 'string', example: 'Kiểm tra đầu vào N3' }
          }
        },
        example: [
          { language: 'vi', value: 'Kiểm tra đầu vào N3' },
          { language: 'en', value: 'N3 Placement Test' }
        ]
      }
    ]
  })
  name: string | Array<{ language: string; value: string }>

  @ApiPropertyOptional({
    description: 'Mô tả bài test. Nếu có language: string; nếu không: mảng translations',
    oneOf: [
      { type: 'string', example: 'Bài kiểm tra đầu vào để đánh giá trình độ N3...' },
      {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            language: { type: 'string', example: 'vi' },
            value: {
              type: 'string',
              example: 'Bài kiểm tra đầu vào để đánh giá trình độ N3...'
            }
          }
        },
        example: [
          { language: 'vi', value: 'Bài kiểm tra đầu vào để đánh giá trình độ N3...' },
          { language: 'en', value: 'Placement test to assess N3 level...' }
        ]
      }
    ]
  })
  description?: string | Array<{ language: string; value: string }>

  @ApiPropertyOptional({ example: 50000, description: 'Giá bài test (VND)' })
  price?: number

  @ApiPropertyOptional({ example: 3, description: 'Cấp độ JLPT (0-5), 0 = nhiều cấp độ' })
  levelN?: number

  @ApiPropertyOptional({
    example: 5,
    description: 'Giới hạn số lần làm bài test (0 = không giới hạn)'
  })
  limit?: number

  @ApiProperty({
    enum: TestStatus,
    example: TestStatus.PLACEMENT_TEST_DONE,
    description:
      'Loại đề thi (PLACEMENT_TEST_DONE, SUBSCRIPTION_TEST, MATCH_TEST, QUIZ_TEST, REVIEW_TEST, PRACTICE_TEST, READING_TEST, LISTENING_TEST, SPEAKING_TEST)'
  })
  testType: TestStatus

  @ApiProperty({
    enum: TestSetStatus,
    example: TestSetStatus.ACTIVE,
    description: 'Trạng thái bài test'
  })
  status: TestSetStatus

  @ApiPropertyOptional({ example: 1, description: 'ID người tạo bài test' })
  creatorId?: number

  @ApiProperty({
    example: '2024-10-24T14:00:00.000Z',
    description: 'Thời gian tạo bài test'
  })
  createdAt: Date

  @ApiProperty({
    example: '2024-10-24T14:30:00.000Z',
    description: 'Thời gian cập nhật bài test'
  })
  updatedAt: Date
}

export class CreateTestSwaggerDTO {
  @ApiPropertyOptional({
    example: [
      { field: 'name', language_code: 'vi', value: 'Kiểm tra đầu vào N3' },
      { field: 'name', language_code: 'en', value: 'N3 Placement Test' },
      {
        field: 'description',
        language_code: 'vi',
        value: 'Bài kiểm tra đầu vào để đánh giá trình độ N3'
      },
      {
        field: 'description',
        language_code: 'en',
        value: 'Placement test to assess N3 level'
      }
    ],
    description: 'Translations cho name và description'
  })
  translations?: Array<{
    field: 'name' | 'description'
    language_code: string
    value: string
  }>

  @ApiPropertyOptional({
    example: 50000,
    description: 'Giá bài test (VND)'
  })
  price?: number | null

  @ApiPropertyOptional({
    example: 3,
    description: 'Cấp độ JLPT (0-5), 0 = nhiều cấp độ'
  })
  levelN?: number | null

  @ApiPropertyOptional({
    example: 10,
    description: 'Giới hạn số lần làm bài test (0 = không giới hạn)'
  })
  limit?: number | null

  @ApiProperty({
    enum: TestStatus,
    example: TestStatus.PLACEMENT_TEST_DONE,
    description:
      'Loại đề thi (PLACEMENT_TEST_DONE, SUBSCRIPTION_TEST, MATCH_TEST, QUIZ_TEST, REVIEW_TEST, PRACTICE_TEST, READING_TEST, LISTENING_TEST, SPEAKING_TEST)'
  })
  testType: TestStatus

  @ApiPropertyOptional({
    enum: TestSetStatus,
    example: TestSetStatus.DRAFT,
    description: 'Trạng thái bài test',
    default: TestSetStatus.DRAFT
  })
  status?: TestSetStatus
}

export class UpdateTestSwaggerDTO {
  @ApiPropertyOptional({
    example: [
      { field: 'name', language_code: 'vi', value: 'Kiểm tra đầu vào N3 (Cập nhật)' },
      { field: 'name', language_code: 'en', value: 'N3 Placement Test (Updated)' },
      {
        field: 'description',
        language_code: 'vi',
        value: 'Bài kiểm tra đầu vào để đánh giá trình độ N3 (Đã cập nhật)'
      },
      {
        field: 'description',
        language_code: 'en',
        value: 'Placement test to assess N3 level (Updated)'
      }
    ],
    description: 'Translations cho name và description'
  })
  translations?: Array<{
    field: 'name' | 'description'
    language_code: string
    value: string
  }>

  @ApiPropertyOptional({
    example: 75000,
    description: 'Giá bài test (VND)'
  })
  price?: number | null

  @ApiPropertyOptional({
    example: 3,
    description: 'Cấp độ JLPT (0-5), 0 = nhiều cấp độ'
  })
  levelN?: number | null

  @ApiPropertyOptional({
    example: 10,
    description: 'Giới hạn số lần làm bài test (0 = không giới hạn)'
  })
  limit?: number | null

  @ApiPropertyOptional({
    enum: TestStatus,
    example: TestStatus.MATCH_TEST,
    description:
      'Loại đề thi (PLACEMENT_TEST_DONE, SUBSCRIPTION_TEST, MATCH_TEST, QUIZ_TEST, REVIEW_TEST, PRACTICE_TEST, READING_TEST, LISTENING_TEST, SPEAKING_TEST)'
  })
  testType?: TestStatus

  @ApiPropertyOptional({
    enum: TestSetStatus,
    example: TestSetStatus.ACTIVE,
    description: 'Trạng thái bài test'
  })
  status?: TestSetStatus
}

export class CreateTestWithMeaningsSwaggerDTO {
  @ApiProperty({
    example: [
      {
        field: 'name',
        translations: {
          vi: 'Kiểm tra đầu vào N3',
          en: 'N3 Placement Test',
          ja: 'N3プレースメントテスト'
        }
      },
      {
        field: 'description',
        translations: {
          vi: 'Bài kiểm tra đầu vào để đánh giá trình độ N3 trong tiếng Nhật',
          en: 'Placement test to assess N3 level in Japanese',
          ja: '日本語のN3レベルを評価するプレースメントテスト'
        }
      }
    ],
    description:
      'Meanings với field (name/description) và translations cho từng ngôn ngữ. meaningKey sẽ được tự động tạo'
  })
  meanings: Array<{
    field: 'name' | 'description'
    meaningKey?: string | null
    translations: {
      vi: string
      en: string
      ja?: string
    }
  }>

  @ApiPropertyOptional({
    example: 50000,
    description: 'Giá bài test (VND)'
  })
  price?: number | null

  @ApiPropertyOptional({
    example: 3,
    description: 'Cấp độ JLPT (0-5), 0 = nhiều cấp độ'
  })
  levelN?: number | null

  @ApiPropertyOptional({
    example: 10,
    description: 'Giới hạn số lần làm bài test'
  })
  limit?: number | null

  @ApiProperty({
    enum: TestStatus,
    example: TestStatus.PLACEMENT_TEST_DONE,
    description:
      'Loại đề thi (PLACEMENT_TEST_DONE, SUBSCRIPTION_TEST, MATCH_TEST, QUIZ_TEST, REVIEW_TEST, PRACTICE_TEST, READING_TEST, LISTENING_TEST, SPEAKING_TEST)'
  })
  testType: TestStatus

  @ApiPropertyOptional({
    enum: TestSetStatus,
    example: TestSetStatus.DRAFT,
    description: 'Trạng thái bài test',
    default: TestSetStatus.DRAFT
  })
  status?: TestSetStatus
}

export class UpdateTestWithMeaningsSwaggerDTO {
  @ApiPropertyOptional({
    example: [
      {
        field: 'name',
        translations: {
          vi: 'Kiểm tra đầu vào N3 (Cập nhật)',
          en: 'N3 Placement Test (Updated)',
          ja: 'N3プレースメントテスト（更新）'
        }
      },
      {
        field: 'description',
        translations: {
          vi: 'Bài kiểm tra đầu vào để đánh giá trình độ N3 trong tiếng Nhật (Đã cập nhật)',
          en: 'Placement test to assess N3 level in Japanese (Updated)',
          ja: '日本語のN3レベルを評価するプレースメントテスト（更新）'
        }
      }
    ],
    description:
      'Meanings với field (name/description) và translations cho từng ngôn ngữ. meaningKey sẽ được tự động tạo'
  })
  meanings?: Array<{
    field: 'name' | 'description'
    meaningKey?: string | null
    translations: {
      vi: string
      en: string
      ja?: string
    }
  }>

  @ApiPropertyOptional({
    example: 75000,
    description: 'Giá bài test (VND)'
  })
  price?: number | null

  @ApiPropertyOptional({
    example: 3,
    description: 'Cấp độ JLPT (0-5), 0 = nhiều cấp độ'
  })
  levelN?: number | null

  @ApiPropertyOptional({
    example: 10,
    description: 'Giới hạn số lần làm bài test'
  })
  limit?: number | null

  @ApiPropertyOptional({
    enum: TestStatus,
    example: TestStatus.MATCH_TEST,
    description:
      'Loại đề thi (PLACEMENT_TEST_DONE, SUBSCRIPTION_TEST, MATCH_TEST, QUIZ_TEST, REVIEW_TEST, PRACTICE_TEST, READING_TEST, LISTENING_TEST, SPEAKING_TEST)'
  })
  testType?: TestStatus

  @ApiPropertyOptional({
    enum: TestSetStatus,
    example: TestSetStatus.ACTIVE,
    description: 'Trạng thái bài test'
  })
  status?: TestSetStatus
}

export class GetTestListQuerySwaggerDTO {
  @ApiPropertyOptional({ example: 1, description: 'Trang hiện tại', default: 1 })
  currentPage?: string

  @ApiPropertyOptional({
    example: 10,
    description: 'Số lượng item mỗi trang',
    default: 10
  })
  pageSize?: string

  @ApiPropertyOptional({ example: 'N3', description: 'Tìm kiếm theo tên hoặc mô tả' })
  search?: string

  @ApiPropertyOptional({
    enum: TestStatus,
    example: TestStatus.PLACEMENT_TEST_DONE,
    description: 'Lọc theo loại đề thi'
  })
  testType?: TestStatus

  @ApiPropertyOptional({
    enum: TestSetStatus,
    example: TestSetStatus.ACTIVE,
    description: 'Lọc theo trạng thái'
  })
  status?: TestSetStatus

  @ApiPropertyOptional({
    example: 3,
    description: 'Lọc theo cấp độ JLPT (0-5), 0 = nhiều cấp độ'
  })
  levelN?: string

  @ApiPropertyOptional({ example: 1, description: 'Lọc theo ID người tạo' })
  creatorId?: string

  @ApiPropertyOptional({
    example: 'vi',
    description: 'Ngôn ngữ để lấy translations (vi, en, ja)'
  })
  language?: string

  @ApiPropertyOptional({
    example: 'createdAt',
    description: 'Sắp xếp theo field',
    default: 'createdAt'
  })
  sortBy?:
    | 'id'
    | 'name'
    | 'testType'
    | 'status'
    | 'price'
    | 'levelN'
    | 'createdAt'
    | 'updatedAt'

  @ApiPropertyOptional({
    example: 'desc',
    description: 'Thứ tự sắp xếp',
    default: 'desc'
  })
  sort?: 'asc' | 'desc'
}

export class TestResponseSwaggerDTO {
  @ApiProperty({ example: 200, description: 'HTTP status code' })
  statusCode: number

  @ApiProperty({ type: TestSwaggerDTO, description: 'Dữ liệu bài test' })
  data: TestSwaggerDTO

  @ApiProperty({ example: 'Lấy thông tin bài test thành công', description: 'Thông báo' })
  message: string
}

export class TestListResponseSwaggerDTO {
  @ApiProperty({ example: 200, description: 'HTTP status code' })
  statusCode: number

  @ApiProperty({
    type: 'object',
    properties: {
      results: {
        type: 'array',
        items: { $ref: '#/components/schemas/TestSwaggerDTO' }
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
    description: 'Dữ liệu danh sách bài test và phân trang'
  })
  data: {
    results: TestSwaggerDTO[]
    pagination: {
      current: number
      pageSize: number
      totalPage: number
      totalItem: number
    }
  }

  @ApiProperty({ example: 'Lấy danh sách bài test thành công', description: 'Thông báo' })
  message: string
}

export class DeleteManyTestsSwaggerDTO {
  @ApiProperty({
    example: [1, 2, 3],
    description: 'Mảng các ID của bài test cần xóa',
    type: [Number]
  })
  ids: number[]
}

export class AddTestSetsToTestSwaggerDTO {
  @ApiProperty({
    example: [1, 2, 3],
    description: 'Mảng các ID của TestSet cần thêm vào Test',
    type: [Number]
  })
  testSetIds: number[]
}

export class RemoveTestSetsFromTestSwaggerDTO {
  @ApiProperty({
    example: [1, 2, 3],
    description: 'Mảng các ID của TestSet cần xóa khỏi Test',
    type: [Number]
  })
  testSetIds: number[]
}
