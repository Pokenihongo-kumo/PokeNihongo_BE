import { ApiProperty } from '@nestjs/swagger'
import { QuestionType } from '@prisma/client'

// Swagger DTOs - for API documentation only
export class TestSetQuestionBankSwaggerDTO {
  @ApiProperty({ example: 1, description: 'ID của TestSetQuestionBank' })
  id: number

  @ApiProperty({ example: 1, description: 'ID của TestSet' })
  testSetId: number

  @ApiProperty({ example: 1, description: 'ID của QuestionBank' })
  questionBankId: number

  @ApiProperty({ example: 1, description: 'Thứ tự câu hỏi trong bộ đề' })
  questionOrder: number

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Thời gian tạo' })
  createdAt: Date

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Thời gian cập nhật' })
  updatedAt: Date
}

export class CreateTestSetQuestionBankSwaggerDTO {
  @ApiProperty({ example: 1, description: 'ID của TestSet' })
  testSetId: number

  @ApiProperty({ example: 1, description: 'ID của QuestionBank' })
  questionBankId: number
}

export class UpdateTestSetQuestionBankSwaggerDTO {
  @ApiProperty({ example: 1, description: 'ID của TestSet', required: false })
  testSetId?: number

  @ApiProperty({ example: 1, description: 'ID của QuestionBank', required: false })
  questionBankId?: number

  @ApiProperty({ example: 1, description: 'Thứ tự câu hỏi trong bộ đề', required: false })
  questionOrder?: number
}

export class UpdateQuestionOrderSwaggerDTO {
  @ApiProperty({ example: 1, description: 'Thứ tự câu hỏi mới trong bộ đề' })
  questionOrder: number
}

export class BatchUpdateQuestionOrderSwaggerDTO {
  @ApiProperty({
    example: [
      { id: 1, questionOrder: 1 },
      { id: 2, questionOrder: 2 },
      { id: 3, questionOrder: 3 }
    ],
    description: 'Danh sách ID và thứ tự mới của các câu hỏi (cho drag & drop)',
    type: [Object]
  })
  orders: Array<{
    id: number
    questionOrder: number
  }>
}

export class DeleteManyTestSetQuestionBankSwaggerDTO {
  @ApiProperty({
    example: [1, 2, 3],
    description: 'Mảng ID của các TestSetQuestionBank cần xóa',
    type: [Number]
  })
  ids: number[]
}

export class CreateMultipleTestSetQuestionBankSwaggerDTO {
  @ApiProperty({ example: 1, description: 'ID của TestSet' })
  testSetId: number

  @ApiProperty({
    example: [1, 2, 3, 4, 5],
    description: 'Mảng ID của các QuestionBank cần thêm vào TestSet',
    type: [Number]
  })
  questionBankIds: number[]
}

export class TestSetQuestionBankResponseSwaggerDTO {
  @ApiProperty({ example: 200, description: 'Mã trạng thái HTTP' })
  statusCode: number

  @ApiProperty({
    type: TestSetQuestionBankSwaggerDTO,
    description: 'Dữ liệu TestSetQuestionBank'
  })
  data: TestSetQuestionBankSwaggerDTO

  @ApiProperty({ example: 'Thao tác thành công', description: 'Thông báo kết quả' })
  message: string
}

export class TestSetQuestionBankListResponseSwaggerDTO {
  @ApiProperty({ example: 200, description: 'Mã trạng thái HTTP' })
  statusCode: number

  @ApiProperty({
    type: [TestSetQuestionBankSwaggerDTO],
    description: 'Danh sách TestSetQuestionBank'
  })
  data: TestSetQuestionBankSwaggerDTO[]

  @ApiProperty({ example: 'Lấy danh sách thành công', description: 'Thông báo kết quả' })
  message: string
}

export class CreateMultipleTestSetQuestionBankResponseSwaggerDTO {
  @ApiProperty({ example: 201, description: 'Mã trạng thái HTTP' })
  statusCode: number

  @ApiProperty({
    example: 'Tạo thành công 3/5 liên kết',
    description: 'Thông báo kết quả'
  })
  message: string

  @ApiProperty({
    description: 'Dữ liệu kết quả tạo nhiều TestSetQuestionBank',
    example: {
      created: [
        {
          id: 1,
          testSetId: 1,
          questionBankId: 1,
          questionOrder: 1,
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-01T00:00:00Z'
        },
        {
          id: 2,
          testSetId: 1,
          questionBankId: 2,
          questionOrder: 2,
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-01T00:00:00Z'
        }
      ],
      failed: [
        {
          questionBankId: 3,
          reason: 'Level không phù hợp: TestSet có level 3 nhưng QuestionBank có level 4'
        },
        {
          questionBankId: 4,
          reason:
            'Loại không tương thích: TestSet có loại "VOCABULARY" nhưng QuestionBank có loại "GRAMMAR"'
        }
      ],
      summary: {
        total: 4,
        success: 2,
        failed: 2
      }
    }
  })
  data: {
    created: TestSetQuestionBankSwaggerDTO[]
    failed: { questionBankId: number; reason: string }[]
    summary: {
      total: number
      success: number
      failed: number
    }
  }
}
