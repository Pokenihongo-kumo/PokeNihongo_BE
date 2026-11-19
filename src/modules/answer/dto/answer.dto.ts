import { ApiProperty } from '@nestjs/swagger'
import { AnswerSortField, SortOrder } from '@/common/enum/enum'

// Translation DTOs
export class MeaningSwaggerDTO {
  @ApiProperty({
    example: 'vi',
    description: 'Mã ngôn ngữ (vi, en, ja)'
  })
  language_code: string

  @ApiProperty({
    example: 'Đây là quyển sách',
    description: 'Giá trị dịch thuật'
  })
  value: string
}

export class TranslationSwaggerDTO {
  @ApiProperty({
    type: [MeaningSwaggerDTO],
    description: 'Danh sách bản dịch'
  })
  meaning: MeaningSwaggerDTO[]
}

// Swagger DTOs - for API documentation only
export class CreateAnswerSwaggerDTO {
  @ApiProperty({
    example: 'これは本です。',
    description: 'Nội dung câu trả lời bằng tiếng Nhật'
  })
  answerJp: string

  @ApiProperty({
    example: true,
    description: 'Đánh dấu câu trả lời đúng',
    required: false
  })
  isCorrect?: boolean

  @ApiProperty({
    example: 1,
    description: 'ID câu hỏi'
  })
  questionBankId: number

  @ApiProperty({
    type: TranslationSwaggerDTO,
    description: 'Bản dịch của câu trả lời (tùy chọn)',
    required: false
  })
  translations?: TranslationSwaggerDTO
}

export class UpdateAnswerSwaggerDTO {
  @ApiProperty({
    example: 'これは本です。',
    description: 'Nội dung câu trả lời bằng tiếng Nhật',
    required: false
  })
  answerJp?: string

  @ApiProperty({
    example: true,
    description: 'Đánh dấu câu trả lời đúng',
    required: false
  })
  isCorrect?: boolean

  @ApiProperty({
    example: 1,
    description: 'ID câu hỏi',
    required: false
  })
  questionId?: number

  @ApiProperty({
    type: TranslationSwaggerDTO,
    description: 'Bản dịch của câu trả lời (tùy chọn)',
    required: false
  })
  translations?: TranslationSwaggerDTO
}

export class GetAnswerListQuerySwaggerDTO {
  @ApiProperty({ example: 1, description: 'Số trang hiện tại', required: false })
  currentPage?: number

  @ApiProperty({
    example: 10,
    description: 'Số lượng câu trả lời mỗi trang',
    required: false
  })
  pageSize?: number

  @ApiProperty({ example: 1, description: 'Lọc theo ID câu hỏi', required: false })
  questionBankId?: number

  @ApiProperty({
    example: true,
    description: 'Lọc theo câu trả lời đúng',
    required: false
  })
  isCorrect?: boolean

  @ApiProperty({
    example: '本',
    description: 'Từ khóa tìm kiếm theo answerJp',
    required: false
  })
  search?: string

  @ApiProperty({
    enum: AnswerSortField,
    example: AnswerSortField.CREATED_AT,
    description:
      'Field để sắp xếp theo answerJp, answerKey, isCorrect, questionId, createdAt, updatedAt',
    required: false
  })
  sortBy?: AnswerSortField

  @ApiProperty({
    enum: SortOrder,
    example: SortOrder.DESC,
    description: 'Sắp xếp theo thứ tự tăng dần (asc) hoặc giảm dần (desc)',
    required: false
  })
  sort?: SortOrder

  @ApiProperty({
    example: 'vi',
    description:
      'Mã ngôn ngữ để lấy translation (vi, en, ja). Nếu không truyền thì lấy hết',
    required: false
  })
  language?: string
}

export class AnswerDataSwaggerDTO {
  @ApiProperty({ example: 1, description: 'ID' })
  id: number

  @ApiProperty({
    example: 'これは本です。',
    description: 'Nội dung câu trả lời bằng tiếng Nhật'
  })
  answerJp: string

  @ApiProperty({
    example: true,
    description: 'Đánh dấu câu trả lời đúng'
  })
  isCorrect: boolean

  @ApiProperty({
    example: 1,
    description: 'ID câu hỏi'
  })
  questionBankId: number

  @ApiProperty({
    example: '2024-01-01T00:00:00.000Z',
    description: 'Ngày tạo'
  })
  createdAt: Date

  @ApiProperty({
    example: '2024-01-01T00:00:00.000Z',
    description: 'Ngày cập nhật'
  })
  updatedAt: Date

  @ApiProperty({ example: 'Đây là quyển sách', required: false })
  meaning?: string

  @ApiProperty({ type: [MeaningSwaggerDTO], required: false })
  meanings?: Array<{ language_code: string; value: string }>
}

export class AnswerResponseSwaggerDTO {
  @ApiProperty({ example: 200, description: 'HTTP status code' })
  statusCode: number

  @ApiProperty({
    type: AnswerDataSwaggerDTO,
    description: 'Dữ liệu câu trả lời'
  })
  data: AnswerDataSwaggerDTO

  @ApiProperty({
    example: 'Tạo câu trả lời thành công',
    description: 'Thông báo kết quả'
  })
  message: string
}

// Answer with translation for list (without answerKey)
export class AnswerWithTranslationSwaggerDTO {
  @ApiProperty({ example: 1, description: 'ID' })
  id: number

  @ApiProperty({
    example: 'これは本です。',
    description: 'Nội dung câu trả lời bằng tiếng Nhật'
  })
  answerJp: string

  @ApiProperty({
    example: true,
    description: 'Đánh dấu câu trả lời đúng'
  })
  isCorrect: boolean

  @ApiProperty({
    example: 1,
    description: 'ID câu hỏi'
  })
  questionBankId: number

  @ApiProperty({ example: 'Đây là quyển sách', required: false })
  meaning?: string

  @ApiProperty({ type: [MeaningSwaggerDTO], required: false })
  meanings?: Array<{ language: string; value: string }>

  @ApiProperty({
    required: false,
    example: { id: 98, questionJp: 'ますますます', questionKey: 'question.LISTENING.98' }
  })
  questionBank?: { id: number; questionJp: string; questionKey?: string | null }

  @ApiProperty({
    example: '2024-01-01T00:00:00.000Z',
    description: 'Ngày tạo'
  })
  createdAt: Date

  @ApiProperty({
    example: '2024-01-01T00:00:00.000Z',
    description: 'Ngày cập nhật'
  })
  updatedAt: Date
}

export class AnswerPaginationSwaggerDTO {
  @ApiProperty({ example: 1, description: 'Trang hiện tại' })
  current: number

  @ApiProperty({ example: 10, description: 'Số câu trả lời mỗi trang' })
  pageSize: number

  @ApiProperty({ example: 10, description: 'Tổng số trang' })
  totalPage: number

  @ApiProperty({ example: 100, description: 'Tổng số câu trả lời' })
  totalItem: number
}

export class AnswerListDataSwaggerDTO {
  @ApiProperty({
    type: [AnswerWithTranslationSwaggerDTO],
    description: 'Danh sách câu trả lời'
  })
  results: AnswerWithTranslationSwaggerDTO[]

  @ApiProperty({
    type: AnswerPaginationSwaggerDTO,
    description: 'Thông tin phân trang'
  })
  pagination: AnswerPaginationSwaggerDTO
}

export class AnswerListResponseSwaggerDTO {
  @ApiProperty({ example: 200, description: 'HTTP status code' })
  statusCode: number

  @ApiProperty({
    type: AnswerListDataSwaggerDTO,
    description: 'Dữ liệu danh sách câu trả lời'
  })
  data: AnswerListDataSwaggerDTO

  @ApiProperty({
    example: 'Lấy danh sách câu trả lời thành công',
    description: 'Thông báo kết quả'
  })
  message: string
}

// Swagger DTOs for multiple answers creation
export class CreateMultipleAnswersSwaggerDTO {
  @ApiProperty({
    example: 1,
    description: 'ID câu hỏi (questionBankId)'
  })
  questionBankId: number

  @ApiProperty({
    type: 'array',
    description:
      'Danh sách câu trả lời cần tạo hoặc cập nhật (tối đa 10 câu). ' +
      '\n\n📌 Cách hoạt động (UPSERT - 2 chiến lược):' +
      '\n\n1️⃣ Update bằng ID (nếu có field "id"):' +
      '\n• Tìm answer theo ID → Update (có thể thay đổi answerJp, isCorrect, translations)' +
      '\n• Cho phép thay đổi answerJp' +
      '\n• ID phải thuộc cùng questionBankId' +
      '\n\n2️⃣ Upsert bằng answerJp (nếu KHÔNG có field "id"):' +
      '\n• Nếu answerJp đã tồn tại → Cập nhật (chỉ update isCorrect, translations, KHÔNG thay đổi answerJp)' +
      '\n• Nếu answerJp chưa tồn tại → Tạo mới' +
      '\n\n📝 Lưu ý:' +
      '\n• questionBankId trong mỗi answer sẽ bị bỏ qua (dùng questionBankId ở ngoài)' +
      '\n• translations là optional, nếu không có sẽ tạo default Vietnamese translation' +
      '\n• Nên dùng ID khi muốn update answerJp, dùng answerJp khi muốn upsert đơn giản',
    example: [
      {
        id: 1,
        answerJp: 'これは本です。',
        isCorrect: true,
        translations: {
          meaning: [
            { language_code: 'vi', value: 'Đây là quyển sách' },
            { language_code: 'en', value: 'This is a book' }
          ]
        }
      },
      {
        answerJp: 'これはペンです。',
        isCorrect: false,
        translations: {
          meaning: [
            { language_code: 'vi', value: 'Đây là cây bút' },
            { language_code: 'en', value: 'This is a pen' }
          ]
        }
      },
      {
        answerJp: 'これは机です。',
        isCorrect: false,
        translations: {
          meaning: [
            { language_code: 'vi', value: 'Đây là cái bàn' },
            { language_code: 'en', value: 'This is a desk' }
          ]
        }
      }
    ],
    isArray: true
  })
  answers: Array<{
    id?: number
    answerJp: string
    isCorrect?: boolean
    translations?: {
      meaning?: Array<{
        language_code: string
        value: string
      }>
    }
  }>
}

export class CreateMultipleAnswersResponseSwaggerDTO {
  @ApiProperty({
    example: 207,
    description:
      'HTTP status code: 201 (tất cả tạo mới), 200 (có update), 207 (mixed), 400 (tất cả failed)'
  })
  statusCode: number

  @ApiProperty({
    description: 'Dữ liệu kết quả tạo hoặc cập nhật nhiều câu trả lời',
    example: {
      created: [
        {
          id: 1,
          answerJp: 'これは本です。',
          answerKey: 'answer.1.text',
          isCorrect: true,
          questionBankId: 1,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z'
        },
        {
          id: 2,
          answerJp: 'これはペンです。',
          answerKey: 'answer.2.text',
          isCorrect: false,
          questionBankId: 1,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z'
        }
      ],
      updated: [
        {
          id: 3,
          answerJp: 'これは机です。',
          answerKey: 'answer.3.text',
          isCorrect: true,
          questionBankId: 1,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T01:00:00.000Z'
        }
      ],
      failed: [
        {
          answerJp: 'これは椅子です。',
          reason: 'Mỗi câu hỏi chỉ được có 1 câu trả lời đúng'
        }
      ],
      summary: {
        total: 4,
        created: 2,
        updated: 1,
        failed: 1
      }
    }
  })
  data: {
    created: AnswerDataSwaggerDTO[]
    updated: AnswerDataSwaggerDTO[]
    failed: Array<{ answerJp: string; reason: string }>
    summary: {
      total: number
      created: number
      updated: number
      failed: number
    }
  }

  @ApiProperty({
    example:
      'Tạo thành công 2 câu trả lời mới, cập nhật 1 câu trả lời, 1 câu trả lời thất bại',
    description: 'Thông báo kết quả chi tiết'
  })
  message: string
}
