import { ApiProperty } from '@nestjs/swagger'

export class UserTestAnswerLogSwaggerDTO {
  @ApiProperty({ example: 1, description: 'ID của log câu trả lời test' })
  id: number

  @ApiProperty({ example: true, description: 'Câu trả lời có đúng không' })
  isCorrect: boolean

  @ApiProperty({ example: 1, description: 'ID lần thử bài test' })
  userTestAttemptId: number

  @ApiProperty({ example: 1, description: 'ID câu hỏi (QuestionBank)' })
  questionBankId: number

  @ApiProperty({ example: 1, description: 'ID đáp án đã chọn' })
  answerId: number

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Ngày tạo' })
  createdAt: Date

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Ngày cập nhật' })
  updatedAt: Date
}

export class CreateUserTestAnswerLogSwaggerDTO {
  @ApiProperty({ example: 1, description: 'ID lần thử bài test' })
  userTestAttemptId: number

  @ApiProperty({ example: 1, description: 'ID câu hỏi (QuestionBank)' })
  questionBankId: number

  @ApiProperty({ example: 1, description: 'ID đáp án đã chọn' })
  answerId: number
}

export class UpdateUserTestAnswerLogSwaggerDTO {
  @ApiProperty({
    example: true,
    description: 'Câu trả lời có đúng không',
    required: false
  })
  isCorrect?: boolean
}

export class UserTestAnswerLogResponseSwaggerDTO {
  @ApiProperty({ example: 200, description: 'Status code' })
  statusCode: number

  @ApiProperty({
    type: UserTestAnswerLogSwaggerDTO,
    description: 'Dữ liệu log câu trả lời test'
  })
  data: UserTestAnswerLogSwaggerDTO

  @ApiProperty({
    example: 'Lấy thông tin log câu trả lời test thành công',
    description: 'Thông báo'
  })
  message: string
}

export class UserTestAnswerLogListResponseSwaggerDTO {
  @ApiProperty({ example: 200, description: 'Status code' })
  statusCode: number

  @ApiProperty({
    description: 'Dữ liệu danh sách log câu trả lời test',
    properties: {
      results: {
        type: 'array',
        items: { $ref: '#/components/schemas/UserTestAnswerLogSwaggerDTO' }
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
    }
  })
  data: {
    results: UserTestAnswerLogSwaggerDTO[]
    pagination: {
      current: number
      pageSize: number
      totalPage: number
      totalItem: number
    }
  }

  @ApiProperty({
    example: 'Lấy danh sách log câu trả lời test thành công',
    description: 'Thông báo'
  })
  message: string
}

export class GetUserTestAnswerLogListQuerySwaggerDTO {
  @ApiProperty({ example: 1, description: 'Trang hiện tại', required: false })
  currentPage?: number

  @ApiProperty({ example: 10, description: 'Số bản ghi mỗi trang', required: false })
  pageSize?: number

  @ApiProperty({ example: 1, description: 'ID lần thử bài test', required: false })
  userTestAttemptId?: number

  @ApiProperty({ example: 1, description: 'ID câu hỏi (QuestionBank)', required: false })
  questionBankId?: number

  @ApiProperty({
    example: true,
    description: 'Lọc theo câu trả lời đúng/sai',
    required: false
  })
  isCorrect?: boolean
}
