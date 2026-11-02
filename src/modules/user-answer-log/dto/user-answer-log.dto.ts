import { ApiProperty } from '@nestjs/swagger'

export class UserAnswerLogSwaggerDTO {
  @ApiProperty({ example: 1, description: 'ID của log câu trả lời' })
  id: number

  @ApiProperty({ example: true, description: 'Câu trả lời có đúng không' })
  isCorrect: boolean

  @ApiProperty({ example: 1, description: 'ID lần thử bài tập' })
  userExerciseAttemptId: number

  @ApiProperty({ example: 1, description: 'ID questionBank' })
  questionBankId: number

  @ApiProperty({ example: 1, description: 'ID câu trả lời' })
  answerId: number

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Ngày tạo' })
  createdAt: Date

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Ngày cập nhật' })
  updatedAt: Date
}

export class CreateUserAnswerLogSwaggerDTO {
  @ApiProperty({ example: 1, description: 'ID lần thử bài tập' })
  userExerciseAttemptId: number

  @ApiProperty({ example: 1, description: 'ID questionBank' })
  questionBankId: number

  @ApiProperty({ example: 1, description: 'ID câu trả lời' })
  answerId: number
}

export class UpdateUserAnswerLogSwaggerDTO {
  @ApiProperty({
    example: true,
    description: 'Câu trả lời có đúng không',
    required: false
  })
  isCorrect?: boolean
}

export class UserAnswerLogResponseSwaggerDTO {
  @ApiProperty({ example: 200, description: 'Status code' })
  statusCode: number

  @ApiProperty({ type: UserAnswerLogSwaggerDTO, description: 'Dữ liệu log câu trả lời' })
  data: UserAnswerLogSwaggerDTO

  @ApiProperty({
    example: 'Lấy thông tin log câu trả lời thành công',
    description: 'Thông báo'
  })
  message: string
}

export class UserAnswerLogListResponseSwaggerDTO {
  @ApiProperty({ example: 200, description: 'Status code' })
  statusCode: number

  @ApiProperty({
    description: 'Dữ liệu danh sách log câu trả lời',
    properties: {
      results: {
        type: 'array',
        items: { $ref: '#/components/schemas/UserAnswerLogSwaggerDTO' }
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
    results: UserAnswerLogSwaggerDTO[]
    pagination: {
      current: number
      pageSize: number
      totalPage: number
      totalItem: number
    }
  }

  @ApiProperty({
    example: 'Lấy danh sách log câu trả lời thành công',
    description: 'Thông báo'
  })
  message: string
}

export class GetUserAnswerLogListQuerySwaggerDTO {
  @ApiProperty({ example: 1, description: 'Trang hiện tại', required: false })
  currentPage?: number

  @ApiProperty({ example: 10, description: 'Số bản ghi mỗi trang', required: false })
  pageSize?: number

  @ApiProperty({ example: 1, description: 'ID lần thử bài tập', required: false })
  userExerciseAttemptId?: number

  @ApiProperty({ example: 1, description: 'ID questionBank', required: false })
  questionBankId?: number

  @ApiProperty({ example: true, description: 'Lọc theo đúng/sai', required: false })
  isCorrect?: boolean
}
