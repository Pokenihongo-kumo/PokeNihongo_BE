import { QuestionType } from '@/common/enum/enum'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { RoleSpeaking } from '@prisma/client'
import { TestSetStatus, TestSetType } from '@prisma/client'

export class TestSetSwaggerDTO {
  @ApiProperty({ example: 1, description: 'ID của bộ đề thi' })
  id: number

  @ApiProperty({
    description: 'Tên bộ đề thi. Nếu có language: string; nếu không: mảng translations',
    oneOf: [
      { type: 'string', example: 'Đề thi từ vựng N3 - Phần 1' },
      {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            language: { type: 'string', example: 'vi' },
            value: { type: 'string', example: 'Đề thi từ vựng N3 - Phần 1' }
          }
        },
        example: [
          { language: 'vi', value: 'Đề thi từ vựng N3 - Phần 1' },
          { language: 'en', value: 'N3 Vocabulary Test - Part 1' }
        ]
      }
    ]
  })
  name: string | Array<{ language: string; value: string }>

  @ApiPropertyOptional({
    description: 'Mô tả bộ đề. Nếu có language: string; nếu không: mảng translations',
    oneOf: [
      { type: 'string', example: 'Bộ đề thi từ vựng N3 bao gồm 50 câu hỏi...' },
      {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            language: { type: 'string', example: 'vi' },
            value: {
              type: 'string',
              example: 'Bộ đề thi từ vựng N3 bao gồm 50 câu hỏi...'
            }
          }
        },
        example: [
          { language: 'vi', value: 'Bộ đề thi từ vựng N3 bao gồm 50 câu hỏi...' },
          { language: 'en', value: 'N3 vocabulary test with 50 questions...' }
        ]
      }
    ]
  })
  description?: string | Array<{ language: string; value: string }>

  @ApiPropertyOptional({
    example:
      '２月１４日は、日本ではバレンタインデーです。キリスト教の特別な日ですが、日本では、女の人が好きな人にチョコレートなどのプレゼントをする日になりました。世界にも同じような日があります。ブラジルでは、６月１２日が「恋人の日」と呼ばれる日です。その日は、男の人も女の人もプレゼントを用意して、恋人におくります。 ブラジルでは、日本のようにチョコレートではなく、写真立てに写真を入れて、プレゼントするそうです。',
    description:
      'Nội dung bài đọc. Bắt buộc phải có và phải là tiếng Nhật (Hiragana, Katakana, Kanji) khi testType là READING'
  })
  content?: string

  @ApiPropertyOptional({
    example:
      'https://storage.googleapis.com/pokenihongo-audio/testset-n3-vocab-instruction.mp3',
    description: 'URL file âm thanh hướng dẫn làm bài'
  })
  audioUrl?: string

  @ApiPropertyOptional({ example: 50000, description: 'Giá bộ đề thi (VND)' })
  price?: number

  @ApiPropertyOptional({ example: 3, description: 'Cấp độ JLPT (1-5)' })
  levelN?: number

  @ApiProperty({
    enum: TestSetType,
    example: TestSetType.VOCABULARY,
    description:
      'Loại đề thi (VOCABULARY, GRAMMAR, KANJI, LISTENING, READING, SPEAKING, GENERAL, PLACEMENT_TEST_DONE)'
  })
  testType: TestSetType

  @ApiProperty({
    enum: TestSetStatus,
    example: TestSetStatus.ACTIVE,
    description: 'Trạng thái bộ đề thi'
  })
  status: TestSetStatus

  @ApiPropertyOptional({ example: 1, description: 'ID người tạo bộ đề thi' })
  creatorId?: number

  @ApiProperty({
    example: '2024-10-24T14:00:00.000Z',
    description: 'Thời gian tạo bộ đề thi'
  })
  createdAt: Date

  @ApiProperty({
    example: '2024-10-24T14:30:00.000Z',
    description: 'Thời gian cập nhật bộ đề thi'
  })
  updatedAt: Date
}

export class QuestionBankSwaggerDTO {
  @ApiProperty({ example: 101, description: 'ID câu hỏi' })
  id: number

  @ApiPropertyOptional({ example: '学校', description: 'Nội dung câu hỏi tiếng Nhật' })
  questionJp?: string

  @ApiProperty({
    example: 'VOCABULARY',
    description:
      'Loại câu hỏi (VOCABULARY, GRAMMAR, KANJI, LISTENING, READING, WRITING, SPEAKING, GENERAL)'
  })
  questionType: string

  @ApiPropertyOptional({
    example: 'https://storage.googleapis.com/pokenihongo-audio/question-101-gakkou.mp3',
    description: 'URL file âm thanh của câu hỏi'
  })
  audioUrl?: string

  @ApiPropertyOptional({ example: 'gakkou', description: 'Phiên âm (romaji)' })
  pronunciation?: string

  @ApiPropertyOptional({
    example: RoleSpeaking.A,
    enum: RoleSpeaking,
    description: 'Vai trò trong SPEAKING (A hoặc B)'
  })
  role?: RoleSpeaking

  @ApiPropertyOptional({ example: 3, description: 'Cấp độ JLPT (1-5)' })
  levelN?: number

  @ApiPropertyOptional({
    description:
      'Meanings của questionBank với format: { vi: "...", en: "...", ja: "..." }',
    type: 'object',
    additionalProperties: { type: 'string' },
    example: {
      vi: 'Trường học',
      en: 'School',
      ja: '学校'
    }
  })
  meanings?: Record<string, string>
}

export class TestSetWithQuestionsSwaggerDTO extends TestSetSwaggerDTO {
  @ApiProperty({
    type: [Object],
    description: 'Danh sách câu hỏi trong bộ đề thi',
    example: [
      {
        id: 1,
        questionOrder: 1,
        questionBank: {
          id: 101,
          questionJp: '学校',
          questionType: 'VOCABULARY',
          audioUrl:
            'https://storage.googleapis.com/pokenihongo-audio/question-101-gakkou.mp3',
          pronunciation: 'gakkou',
          levelN: 3,
          questionOrder: 1
        }
      },
      {
        id: 2,
        questionOrder: 2,
        questionBank: {
          id: 102,
          questionJp: '先生',
          questionType: 'VOCABULARY',
          audioUrl:
            'https://storage.googleapis.com/pokenihongo-audio/question-102-sensei.mp3',
          pronunciation: 'sensei',
          levelN: 3,
          questionOrder: 2
        }
      }
    ]
  })
  testSetQuestionBanks: Array<{
    id: number
    questionOrder: number
    questionBank: QuestionBankSwaggerDTO
  }>
}

export class CreateTestSetSwaggerDTO {
  @ApiPropertyOptional({
    example:
      '２月１４日は、日本ではバレンタインデーです。キリスト教の特別な日ですが、日本では、女の人が好きな人にチョコレートなどのプレゼントをする日になりました。世界にも同じような日があります。ブラジルでは、６月１２日が「恋人の日」と呼ばれる日です。その日は、男の人も女の人もプレゼントを用意して、恋人におくります。 ブラジルでは、日本のようにチョコレートではなく、写真立てに写真を入れて、プレゼントするそうです。',
    description: 'Bài đọc bằng tiếng nhật'
  })
  content?: string | null

  @ApiPropertyOptional({
    example: [
      { field: 'name', language_code: 'vi', value: 'Đề thi từ vựng N3 - Phần 1' },
      { field: 'name', language_code: 'en', value: 'N3 Vocabulary Test - Part 1' },
      {
        field: 'description',
        language_code: 'vi',
        value: 'Bộ đề thi từ vựng N3 bao gồm 50 câu hỏi về từ vựng cơ bản'
      },
      {
        field: 'description',
        language_code: 'en',
        value: 'N3 vocabulary test with 50 basic vocabulary questions'
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
    example:
      'https://storage.googleapis.com/pokenihongo-audio/testset-n3-vocab-instruction.mp3',
    description: 'URL file âm thanh hướng dẫn làm bài'
  })
  audioUrl?: string | null

  @ApiPropertyOptional({
    example: 50000,
    description: 'Giá bộ đề thi (VND)'
  })
  price?: number | null

  @ApiPropertyOptional({
    example: 3,
    description: 'Cấp độ JLPT (1-5)'
  })
  levelN?: number | null

  @ApiProperty({
    enum: TestSetType,
    example: TestSetType.VOCABULARY,
    description:
      'Loại đề thi (VOCABULARY, GRAMMAR, KANJI, LISTENING, READING, SPEAKING, GENERAL, PLACEMENT_TEST_DONE)'
  })
  testType: TestSetType

  @ApiPropertyOptional({
    enum: TestSetStatus,
    example: TestSetStatus.DRAFT,
    description: 'Trạng thái bộ đề thi',
    default: TestSetStatus.DRAFT
  })
  status?: TestSetStatus
}

export class UpdateTestSetSwaggerDTO {
  @ApiPropertyOptional({
    example:
      'Chọn cấu trúc ngữ pháp đúng để hoàn thành câu. Mỗi câu hỏi có 4 lựa chọn A, B, C, D. (Nội dung đã cập nhật)',
    description: 'Nội dung hướng dẫn làm bài'
  })
  content?: string | null

  @ApiPropertyOptional({
    example: [
      {
        field: 'name',
        language_code: 'vi',
        value: 'Đề thi ngữ pháp N3 - Phần 2 (Cập nhật)'
      },
      { field: 'name', language_code: 'en', value: 'N3 Grammar Test - Part 2 (Updated)' },
      {
        field: 'description',
        language_code: 'vi',
        value: 'Bộ đề thi ngữ pháp N3 bao gồm 40 câu hỏi về cấu trúc ngữ pháp nâng cao'
      },
      {
        field: 'description',
        language_code: 'en',
        value: 'N3 grammar test with 40 advanced grammar structure questions'
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
    example:
      'https://storage.googleapis.com/pokenihongo-audio/testset-n3-grammar-instruction-updated.mp3',
    description: 'URL file âm thanh hướng dẫn làm bài'
  })
  audioUrl?: string | null

  @ApiPropertyOptional({
    example: 75000,
    description: 'Giá bộ đề thi (VND)'
  })
  price?: number | null

  @ApiPropertyOptional({
    example: 3,
    description: 'Cấp độ JLPT (1-5)'
  })
  levelN?: number | null

  @ApiPropertyOptional({
    enum: TestSetType,
    example: TestSetType.GRAMMAR,
    description:
      'Loại đề thi (VOCABULARY, GRAMMAR, KANJI, LISTENING, READING, SPEAKING, GENERAL, PLACEMENT_TEST_DONE)'
  })
  testType?: TestSetType

  @ApiPropertyOptional({
    enum: TestSetStatus,
    example: TestSetStatus.ACTIVE,
    description: 'Trạng thái bộ đề thi'
  })
  status?: TestSetStatus
}

export class CreateTestSetWithMeaningsSwaggerDTO {
  @ApiPropertyOptional({
    example:
      '２月１４日は、日本ではバレンタインデーです。キリスト教の特別な日ですが、日本では、女の人が好きな人にチョコレートなどのプレゼントをする日になりました。世界にも同じような日があります。ブラジルでは、６月１２日が「恋人の日」と呼ばれる日です。その日は、男の人も女の人もプレゼントを用意して、恋人におくります。 ブラジルでは、日本のようにチョコレートではなく、写真立てに写真を入れて、プレゼントするそうです。',
    description: 'Bài đọc bằng tiếng nhật'
  })
  content?: string | null

  @ApiProperty({
    example: [
      {
        field: 'name',
        translations: {
          vi: 'Đề thi từ vựng N3 - Phần 1',
          en: 'N3 Vocabulary Test - Part 1',
          ja: 'N3語彙テスト - パート1'
        }
      },
      {
        field: 'description',
        translations: {
          vi: 'Bộ đề thi từ vựng N3 bao gồm 50 câu hỏi về từ vựng cơ bản trong tiếng Nhật',
          en: 'N3 vocabulary test with 50 basic vocabulary questions in Japanese',
          ja: 'N3語彙テスト50問の基本語彙問題を含む'
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
    example:
      'https://storage.googleapis.com/pokenihongo-audio/testset-n3-vocab-instruction.mp3',
    description: 'URL file âm thanh hướng dẫn làm bài'
  })
  audioUrl?: string | null

  @ApiPropertyOptional({
    example: 50000,
    description: 'Giá bộ đề thi (VND)'
  })
  price?: number | null

  @ApiPropertyOptional({
    example: 3,
    description: 'Cấp độ JLPT (1-5)'
  })
  levelN?: number | null

  @ApiProperty({
    enum: TestSetType,
    example: TestSetType.VOCABULARY,
    description:
      'Loại đề thi (VOCABULARY, GRAMMAR, KANJI, LISTENING, READING, SPEAKING, GENERAL, PLACEMENT_TEST_DONE)'
  })
  testType: TestSetType

  @ApiPropertyOptional({
    enum: TestSetStatus,
    example: TestSetStatus.DRAFT,
    description: 'Trạng thái bộ đề thi',
    default: TestSetStatus.DRAFT
  })
  status?: TestSetStatus
}

export class UpdateTestSetWithMeaningsSwaggerDTO {
  @ApiPropertyOptional({
    example:
      'Chọn cấu trúc ngữ pháp đúng để hoàn thành câu. Mỗi câu hỏi có 4 lựa chọn A, B, C, D. (Nội dung đã cập nhật)',
    description: 'Nội dung hướng dẫn làm bài'
  })
  content?: string | null

  @ApiPropertyOptional({
    example: [
      {
        field: 'name',
        translations: {
          vi: 'Đề thi ngữ pháp N3 - Phần 2 (Cập nhật)',
          en: 'N3 Grammar Test - Part 2 (Updated)',
          ja: 'N3文法テスト - パート2（更新）'
        }
      },
      {
        field: 'description',
        translations: {
          vi: 'Bộ đề thi ngữ pháp N3 bao gồm 40 câu hỏi về cấu trúc ngữ pháp nâng cao (Cập nhật)',
          en: 'N3 grammar test with 40 advanced grammar structure questions (Updated)',
          ja: 'N3文法テスト40問の高度な文法構造問題を含む（更新）'
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
    example:
      'https://storage.googleapis.com/pokenihongo-audio/testset-n3-grammar-instruction-updated.mp3',
    description: 'URL file âm thanh hướng dẫn làm bài'
  })
  audioUrl?: string | null

  @ApiPropertyOptional({
    example: 75000,
    description: 'Giá bộ đề thi (VND)'
  })
  price?: number | null

  @ApiPropertyOptional({
    example: 3,
    description: 'Cấp độ JLPT (1-5)'
  })
  levelN?: number | null

  @ApiPropertyOptional({
    enum: TestSetType,
    example: TestSetType.GRAMMAR,
    description:
      'Loại đề thi (VOCABULARY, GRAMMAR, KANJI, LISTENING, READING, SPEAKING, GENERAL, PLACEMENT_TEST_DONE)'
  })
  testType?: TestSetType

  @ApiPropertyOptional({
    enum: TestSetStatus,
    example: TestSetStatus.ACTIVE,
    description: 'Trạng thái bộ đề thi'
  })
  status?: TestSetStatus
}

export class GetTestSetListQuerySwaggerDTO {
  @ApiPropertyOptional({ example: '1', description: 'Trang hiện tại' })
  currentPage?: string

  @ApiPropertyOptional({ example: '10', description: 'Số lượng mỗi trang' })
  pageSize?: string

  @ApiPropertyOptional({
    example: 'N3 vocabulary',
    description: 'Tìm kiếm theo tên hoặc mô tả bộ đề thi'
  })
  search?: string

  @ApiPropertyOptional({ example: '3', description: 'Lọc theo cấp độ JLPT (1-5)' })
  levelN?: string

  @ApiPropertyOptional({
    enum: TestSetType,
    example: TestSetType.VOCABULARY,
    description:
      'Lọc theo loại đề thi (VOCABULARY, GRAMMAR, KANJI, LISTENING, READING, SPEAKING, GENERAL, PLACEMENT_TEST_DONE)'
  })
  testType?: TestSetType

  @ApiPropertyOptional({
    enum: TestSetStatus,
    example: TestSetStatus.ACTIVE,
    description: 'Lọc theo trạng thái bộ đề thi'
  })
  status?: TestSetStatus

  @ApiPropertyOptional({ example: '1', description: 'Lọc theo ID người tạo bộ đề thi' })
  creatorId?: string

  @ApiPropertyOptional({
    example: 'vi',
    description:
      'Lọc theo ngôn ngữ (vi, en, ja). Nếu không truyền sẽ lấy tất cả translations'
  })
  language?: string

  @ApiPropertyOptional({
    enum: [
      'id',
      'name',
      'testType',
      'levelN',
      'status',
      'price',
      'createdAt',
      'updatedAt'
    ],
    example: 'createdAt',
    description:
      'Sắp xếp theo trường id, name, testType, levelN, status, price, createdAt, updatedAt'
  })
  sortBy?: string

  @ApiPropertyOptional({
    enum: ['asc', 'desc'],
    example: 'desc',
    description: 'Thứ tự sắp xếp (asc: tăng dần, desc: giảm dần)'
  })
  sort?: string

  @ApiPropertyOptional({
    example: 'true',
    description: 'Nếu true, chỉ lấy những testSet chưa có Exercise nào gắn vào'
  })
  noExercies?: boolean

  @ApiPropertyOptional({
    example: 'true',
    description:
      'Nếu true, chỉ lấy những testSet có price = 0 (miễn phí). Nếu false hoặc không truyền, lấy tất cả'
  })
  noPrice?: boolean
}

export class TestSetResponseSwaggerDTO {
  @ApiProperty({ example: 200, description: 'Mã trạng thái HTTP' })
  statusCode: number

  @ApiProperty({ type: TestSetSwaggerDTO, description: 'Dữ liệu bộ đề thi' })
  data: TestSetSwaggerDTO

  @ApiProperty({
    example: 'Lấy thông tin bộ đề thi thành công',
    description: 'Thông báo kết quả'
  })
  message: string
}

export class TestSetListResponseSwaggerDTO {
  @ApiProperty({ example: 200, description: 'Mã trạng thái HTTP' })
  statusCode: number

  @ApiProperty({
    type: Object,
    description: 'Dữ liệu danh sách bộ đề thi',
    example: {
      results: [
        {
          id: 1,
          name: [
            { language: 'vi', value: 'Đề thi từ vựng N3 - Phần 1' },
            { language: 'en', value: 'N3 Vocabulary Test - Part 1' },
            { language: 'ja', value: 'N3語彙テスト - パート1' }
          ],
          description: [
            {
              language: 'vi',
              value:
                'Bộ đề thi từ vựng N3 bao gồm 50 câu hỏi về từ vựng cơ bản trong tiếng Nhật'
            },
            {
              language: 'en',
              value: 'N3 vocabulary test with 50 basic vocabulary questions in Japanese'
            },
            { language: 'ja', value: 'N3語彙テスト50問の基本語彙問題を含む' }
          ],
          testType: 'VOCABULARY',
          levelN: 3,
          status: 'ACTIVE',
          price: 50000,
          content: null,
          audioUrl:
            'https://storage.googleapis.com/pokenihongo-audio/testset-n3-vocab-instruction.mp3',
          creatorId: 1,
          createdAt: '2024-10-24T14:00:00.000Z',
          updatedAt: '2024-10-24T14:30:00.000Z'
        }
      ],
      pagination: {
        current: 1,
        pageSize: 10,
        totalPage: 5,
        totalItem: 50
      }
    }
  })
  data: {
    results: TestSetSwaggerDTO[]
    pagination: {
      current: number
      pageSize: number
      totalPage: number
      totalItem: number
    }
  }

  @ApiProperty({
    example: 'Lấy danh sách bộ đề thi thành công',
    description: 'Thông báo kết quả'
  })
  message: string
}

export class TestSetWithQuestionsFullSwaggerDTO {
  @ApiProperty({ example: 1, description: 'ID của bộ đề thi' })
  id: number

  @ApiProperty({
    description: 'Tên bộ đề thi với format: [{ vi: "...", en: "..." }]',
    type: 'array',
    items: {
      type: 'object',
      additionalProperties: { type: 'string' }
    },
    example: [
      {
        vi: 'Đề thi từ vựng N3 - Phần 1',
        en: 'N3 Vocabulary Test - Part 1'
      }
    ]
  })
  name: Array<Record<string, string>>

  @ApiPropertyOptional({
    description: 'Mô tả bộ đề với format: [{ vi: "...", en: "..." }]',
    type: 'array',
    items: {
      type: 'object',
      additionalProperties: { type: 'string' }
    },
    example: [
      {
        vi: 'Bộ đề thi từ vựng N3 bao gồm 50 câu hỏi về từ vựng cơ bản',
        en: 'N3 vocabulary test with 50 basic vocabulary questions'
      }
    ]
  })
  description?: Array<Record<string, string>>

  @ApiPropertyOptional({
    example:
      '２月１４日は、日本ではバレンタインデーです。キリスト教の特別な日ですが、日本では、女の人が好きな人にチョコレートなどのプレゼントをする日になりました。世界にも同じような日があります。ブラジルでは、６月１２日が「恋人の日」と呼ばれる日です。その日は、男の人も女の人もプレゼントを用意して、恋人におくります。 ブラジルでは、日本のようにチョコレートではなく、写真立てに写真を入れて、プレゼントするそうです。',
    description:
      'Nội dung bài đọc. Bắt buộc phải có và phải là tiếng Nhật (Hiragana, Katakana, Kanji) khi testType là READING'
  })
  content?: string

  @ApiPropertyOptional({
    example:
      'https://storage.googleapis.com/pokenihongo-audio/testset-n3-vocab-instruction.mp3',
    description: 'URL file âm thanh hướng dẫn làm bài'
  })
  audioUrl?: string

  @ApiPropertyOptional({ example: 50000, description: 'Giá bộ đề thi (VND)' })
  price?: number

  @ApiPropertyOptional({ example: 3, description: 'Cấp độ JLPT (1-5)' })
  levelN?: number

  @ApiProperty({
    enum: TestSetType,
    example: TestSetType.VOCABULARY,
    description:
      'Loại đề thi (VOCABULARY, GRAMMAR, KANJI, LISTENING, READING, SPEAKING, GENERAL, PLACEMENT_TEST_DONE)'
  })
  testType: TestSetType

  @ApiProperty({
    enum: TestSetStatus,
    example: TestSetStatus.ACTIVE,
    description: 'Trạng thái bộ đề thi'
  })
  status: TestSetStatus

  @ApiPropertyOptional({ example: 1, description: 'ID người tạo bộ đề thi' })
  creatorId?: number

  @ApiProperty({
    example: '2024-10-24T14:00:00.000Z',
    description: 'Thời gian tạo bộ đề thi'
  })
  createdAt: Date

  @ApiProperty({
    example: '2024-10-24T14:30:00.000Z',
    description: 'Thời gian cập nhật bộ đề thi'
  })
  updatedAt: Date

  @ApiProperty({
    type: [Object],
    description: 'Danh sách câu hỏi trong bộ đề thi',
    example: [
      {
        id: 1,
        questionOrder: 1,
        questionBank: {
          id: 101,
          questionJp: '学校',
          questionType: 'VOCABULARY',
          audioUrl:
            'https://storage.googleapis.com/pokenihongo-audio/question-101-gakkou.mp3',
          pronunciation: 'gakkou',
          levelN: 3,
          meanings: {
            vi: 'Trường học',
            en: 'School',
            ja: '学校'
          }
        }
      }
    ]
  })
  testSetQuestionBanks: Array<{
    id: number
    questionOrder: number
    questionBank: QuestionBankSwaggerDTO & {
      meanings?: Record<string, string>
    }
  }>
}

export class TestSetWithQuestionsResponseSwaggerDTO {
  @ApiProperty({ example: 200, description: 'Mã trạng thái HTTP' })
  statusCode: number

  @ApiProperty({
    type: TestSetWithQuestionsSwaggerDTO,
    description: 'Dữ liệu bộ đề thi với danh sách câu hỏi'
  })
  data: TestSetWithQuestionsSwaggerDTO

  @ApiProperty({
    example: 'Lấy thông tin bộ đề thi với câu hỏi thành công',
    description: 'Thông báo kết quả'
  })
  message: string
}

export class TestSetWithQuestionsFullResponseSwaggerDTO {
  @ApiProperty({ example: 200, description: 'Mã trạng thái HTTP' })
  statusCode: number

  @ApiProperty({
    type: TestSetWithQuestionsFullSwaggerDTO,
    description: 'Dữ liệu bộ đề thi với danh sách câu hỏi và full translations'
  })
  data: TestSetWithQuestionsFullSwaggerDTO

  @ApiProperty({
    example: 'Lấy thông tin bộ đề thi với questionBanks và full translations thành công',
    description: 'Thông báo kết quả'
  })
  message: string
}

export class CreateTestSetWithQuestionSwaggerDTO {
  @ApiPropertyOptional({
    example:
      '２月１４日は、日本ではバレンタインデーです。キリスト教の特別な日ですが、日本では、女の人が好きな人にチョコレートなどのプレゼントをする日になりました。世界にも同じような日があります。ブラジルでは、６月１２日が「恋人の日」と呼ばれる日です。その日は、男の人も女の人もプレゼントを用意して、恋人におくります。 ブラジルでは、日本のようにチョコレートではなく、写真立てに写真を入れて、プレゼントするそうです。',
    description: 'Bài đọc bằng tiếng nhật'
  })
  content?: string | null

  @ApiProperty({
    example: [
      { field: 'name', language_code: 'vi', value: 'Đề thi từ vựng N3 - Phần 1' },
      { field: 'name', language_code: 'en', value: 'N3 Vocabulary Test - Part 1' },
      {
        field: 'description',
        language_code: 'vi',
        value: 'Bộ đề thi từ vựng N3 bao gồm 50 câu hỏi về từ vựng cơ bản'
      },
      {
        field: 'description',
        language_code: 'en',
        value: 'N3 vocabulary test with 50 basic vocabulary questions'
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
    example:
      'https://storage.googleapis.com/pokenihongo-audio/testset-n3-vocab-instruction.mp3',
    description: 'URL file âm thanh hướng dẫn làm bài'
  })
  audioUrl?: string | null

  @ApiPropertyOptional({
    example: 50000,
    description: 'Giá bộ đề thi (VND)'
  })
  price?: number | null

  @ApiPropertyOptional({
    example: 3,
    description: 'Cấp độ JLPT (1-5)'
  })
  levelN?: number | null

  @ApiProperty({
    enum: TestSetType,
    example: TestSetType.VOCABULARY,
    description:
      'Loại đề thi (VOCABULARY, GRAMMAR, KANJI, LISTENING, READING, SPEAKING, GENERAL, PLACEMENT_TEST_DONE)'
  })
  testType: TestSetType

  @ApiPropertyOptional({
    enum: TestSetStatus,
    example: TestSetStatus.DRAFT,
    description: 'Trạng thái bộ đề thi',
    default: TestSetStatus.DRAFT
  })
  status?: TestSetStatus

  @ApiProperty({
    example: [101, 102, 103, 104, 105],
    description: 'Danh sách ID các questionBank cần thêm vào bộ đề',
    type: [Number]
  })
  questionBankIds: number[]
}

export class UpsertTestSetWithQuestionBanksSwaggerDTO {
  @ApiPropertyOptional({
    example: 1,
    description: 'ID của TestSet (nếu có = update, nếu không có = tạo mới)'
  })
  id?: number

  @ApiProperty({
    example: [
      {
        field: 'name',
        translations: {
          vi: 'Đề thi từ vựng N3 - Phần 1',
          en: 'N3 Vocabulary Test - Part 1',
          ja: 'N3語彙テスト - パート1'
        }
      },
      {
        field: 'description',
        translations: {
          vi: 'Bộ đề thi từ vựng N3 bao gồm 50 câu hỏi về từ vựng cơ bản trong tiếng Nhật',
          en: 'N3 vocabulary test with 50 basic vocabulary questions in Japanese',
          ja: 'N3語彙テスト50問の基本語彙問題を含む'
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
    example: null,
    description: 'URL file âm thanh hướng dẫn làm bài'
  })
  audioUrl?: string | null

  @ApiPropertyOptional({
    example: null,
    description: 'Giá bộ đề thi (VND)'
  })
  price?: number | null

  @ApiPropertyOptional({
    example: 5,
    description: 'Cấp độ JLPT (0-5)'
  })
  levelN?: number | null

  @ApiPropertyOptional({
    enum: TestSetType,
    example: TestSetType.SPEAKING,
    description: 'SPEAKING Bắt buộc khi tạo mới'
  })
  testType?: TestSetType

  @ApiPropertyOptional({
    enum: TestSetStatus,
    example: TestSetStatus.DRAFT,
    description: 'Trạng thái bộ đề thi'
  })
  status?: TestSetStatus

  @ApiPropertyOptional({
    example: [
      {
        id: 1, // ID của TestSetQuestionBank (nếu có = update order, nếu không = tạo mới)
        questionJp: '学',
        questionType: QuestionType.SPEAKING,
        audioUrl: null,
        role: RoleSpeaking.A,
        pronunciation: 'gakkou',
        levelN: 3,
        meanings: [
          {
            translations: {
              vi: 'Trường học',
              en: 'School',
              ja: '学校'
            }
          }
        ]
      },
      {
        id: 2, // Có id = update order dựa vào vị trí trong mảng (order = 2)
        questionJp: '先生',
        questionType: QuestionType.SPEAKING,
        audioUrl: null,
        role: RoleSpeaking.B,
        pronunciation: 'sensei',
        levelN: 3,
        meanings: [
          {
            translations: {
              vi: 'Giáo viên',
              en: 'Teacher',
              ja: '生'
            }
          }
        ]
      }
    ],
    description:
      'Danh sách questionBank. Order tự động = vị trí trong mảng (index + 1). Nếu có id = TestSetQuestionBank.id (update order), nếu không có id = tạo questionBank mới',
    type: [Object]
  })
  questionBanks?: Array<{
    id?: number // ID của TestSetQuestionBank (optional)
    questionJp?: string
    questionType?: string
    audioUrl?: string | null
    pronunciation?: string | null
    role?: string | null
    levelN?: number | null
    meanings?: Array<{
      meaningKey?: string | null
      translations: Record<string, string>
    }>
  }>
}
