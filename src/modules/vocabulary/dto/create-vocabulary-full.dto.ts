import { ApiProperty } from '@nestjs/swagger'
import { z } from 'zod'
import { createZodDto } from 'nestjs-zod'

// Schema cho translation item
const TranslationItemSchema = z.object({
  language_code: z.string().min(2, 'Mã ngôn ngữ phải có ít nhất 2 ký tự'),
  value: z.string().min(1, 'Nội dung dịch không được để trống')
})

// Schema cho example translation item (sentence trong một ngôn ngữ)
const ExampleTranslationItemSchema = z.object({
  language_code: z.string().min(2, 'Mã ngôn ngữ phải có ít nhất 2 ký tự'),
  sentence: z.string().min(1, 'Câu dịch không được để trống')
})

// Schema cho example (có original_sentence và translations)
const ExampleTranslationSchema = z.object({
  original_sentence: z.string().min(1, 'Câu gốc không được để trống'),
  translations: z.array(ExampleTranslationItemSchema).min(1, 'Phải có ít nhất 1 bản dịch')
})

// Schema cho translations object
const TranslationsSchema = z.object({
  meaning: z.array(TranslationItemSchema).min(1, 'Phải có ít nhất 1 nghĩa'),
  examples: z.array(ExampleTranslationSchema).optional()
})

// Main schema (for JSON body)
export const CreateVocabularyFullSchema = z.object({
  word_jp: z.string().min(1, 'Từ tiếng Nhật không được để trống'),
  reading: z.string().min(1, 'Cách đọc không được để trống'),
  level_n: z.number().min(1).max(5).optional(),
  word_type_id: z.number().min(1, 'Word type ID phải lớn hơn 0').optional(),
  audio_url: z.string().url().optional(),
  image_url: z.string().url().optional(),
  translations: TranslationsSchema
})

// Schema for multipart/form-data (translations as string or object)
export const CreateVocabularyFullMultipartSchema = z.object({
  word_jp: z.string().min(1, 'Từ tiếng Nhật không được để trống'),
  reading: z.string().min(1, 'Cách đọc không được để trống'),
  level_n: z
    .string()
    .transform((val) => parseInt(val, 10))
    .optional(),
  word_type_id: z
    .string()
    .transform((val) => parseInt(val, 10))
    .optional(),
  translations: z.union([
    z.string().transform((val) => JSON.parse(val)), // JSON string → object
    TranslationsSchema // Object trực tiếp
  ])
})

// Zod DTOs

export class CreateVocabularyFullMultipartDTO extends createZodDto(
  CreateVocabularyFullMultipartSchema
) {}

// Swagger DTOs for documentation
export class TranslationItemSwaggerDTO {
  @ApiProperty({
    example: 'vi',
    description: 'Mã ngôn ngữ (ISO 639-1)',
    enum: ['vi', 'en']
  })
  language_code: string

  @ApiProperty({
    example: 'Tiếng Nhật',
    description: 'Nội dung dịch'
  })
  value: string
}

export class ExampleTranslationItemSwaggerDTO {
  @ApiProperty({
    example: 'vi',
    description: 'Mã ngôn ngữ (ISO 639-1)',
    enum: ['vi', 'en']
  })
  language_code: string

  @ApiProperty({
    example: 'Tôi đang học tiếng Nhật.',
    description: 'Câu dịch'
  })
  sentence: string
}

export class ExampleTranslationSwaggerDTO {
  @ApiProperty({
    example: '私は日本語を勉強しています。',
    description: 'Câu gốc tiếng Nhật'
  })
  original_sentence: string

  @ApiProperty({
    type: [ExampleTranslationItemSwaggerDTO],
    description: 'Danh sách bản dịch theo ngôn ngữ (vi, en)',
    example: [
      { language_code: 'vi', sentence: 'Tôi đang học tiếng Nhật.' },
      { language_code: 'en', sentence: 'I am studying Japanese.' }
    ]
  })
  translations: ExampleTranslationItemSwaggerDTO[]
}

export class TranslationsSwaggerDTO {
  @ApiProperty({
    type: [TranslationItemSwaggerDTO],
    description: 'Danh sách nghĩa theo ngôn ngữ'
  })
  meaning: TranslationItemSwaggerDTO[]

  @ApiProperty({
    type: [ExampleTranslationSwaggerDTO],
    description: 'Danh sách ví dụ theo ngôn ngữ',
    required: false
  })
  examples?: ExampleTranslationSwaggerDTO[]
}

export class CreateVocabularyFullSwaggerDTO {
  @ApiProperty({
    example: '日本語',
    description: 'Từ tiếng Nhật'
  })
  word_jp: string

  @ApiProperty({
    example: 'にほんご',
    description: 'Cách đọc (Hiragana)'
  })
  reading: string

  @ApiProperty({
    example: 5,
    description: 'Cấp độ JLPT (N5-N1)',
    required: false
  })
  level_n?: number

  @ApiProperty({
    example: 1,
    description:
      'ID loại từ: 1=noun, 2=pronoun, 3=particle, 4=adverb, 5=conjunction, 6=interjection, 7=numeral, 8=counter, 9=prefix, 10=suffix, 11=i_adjective, 12=na_adjective, 13=no_adjective, 14=verb_ichidan, 15=verb_godan, 16=verb_irregular, 17=verb_suru, 18=verb_kuru, 19-31=verb_forms, 32=onomatopoeia, 33=mimetic_word, 34=honorific, 35=humble, 36=polite, 37=casual',
    enum: [
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23,
      24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37
    ],
    required: false
  })
  word_type_id?: number

  @ApiProperty({
    example: 'https://res.cloudinary.com/audio.mp3',
    description: 'URL file âm thanh',
    required: false
  })
  audio_url?: string

  @ApiProperty({
    example: 'https://res.cloudinary.com/image.jpg',
    description: 'URL hình ảnh',
    required: false
  })
  image_url?: string

  @ApiProperty({
    oneOf: [
      {
        type: 'string',
        example:
          '{"meaning":[{"language_code":"vi","value":"Tiếng Nhật"},{"language_code":"en","value":"Japanese language"}],"examples":[{"original_sentence":"私は日本語を勉強しています","translations":[{"language_code":"vi","sentence":"Tôi đang học tiếng Nhật"},{"language_code":"en","sentence":"I am studying Japanese"}]}]}'
      },
      { type: 'object', $ref: '#/components/schemas/TranslationsSwaggerDTO' }
    ],
    description: 'Các bản dịch nghĩa và ví dụ (có thể là JSON string hoặc object)'
  })
  translations: string | TranslationsSwaggerDTO
}

// Swagger DTO for multipart/form-data with file uploads
export class CreateVocabularyFullMultipartSwaggerDTO {
  @ApiProperty({
    example: '日本語',
    description: 'Từ tiếng Nhật'
  })
  word_jp: string

  @ApiProperty({
    example: 'にほんご',
    description: 'Cách đọc (Hiragana)'
  })
  reading: string

  @ApiProperty({
    example: '5',
    description: 'Cấp độ JLPT (N5-N1)',
    required: false
  })
  level_n?: string

  @ApiProperty({
    example: '1',
    description:
      'ID loại từ: 1=noun, 2=pronoun, 3=particle, 4=adverb, 5=conjunction, 6=interjection, 7=numeral, 8=counter, 9=prefix, 10=suffix, 11=i_adjective, 12=na_adjective, 13=no_adjective, 14=verb_ichidan, 15=verb_godan, 16=verb_irregular, 17=verb_suru, 18=verb_kuru, 19-31=verb_forms, 32=onomatopoeia, 33=mimetic_word, 34=honorific, 35=humble, 36=polite, 37=casual',
    required: false,
    enum: [
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
      '9',
      '10',
      '11',
      '12',
      '13',
      '14',
      '15',
      '16',
      '17',
      '18',
      '19',
      '20',
      '21',
      '22',
      '23',
      '24',
      '25',
      '26',
      '27',
      '28',
      '29',
      '30',
      '31',
      '32',
      '33',
      '34',
      '35',
      '36',
      '37'
    ]
  })
  word_type_id?: string

  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'File âm thanh (audio)',
    required: false
  })
  audioFile?: Express.Multer.File

  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'File hình ảnh (image)',
    required: false
  })
  imageFile?: Express.Multer.File

  @ApiProperty({
    oneOf: [
      {
        type: 'string',
        example:
          '{"meaning":[{"language_code":"vi","value":"Tiếng Nhật"},{"language_code":"en","value":"Japanese language"}],"examples":[{"original_sentence":"私は日本語を勉強しています","translations":[{"language_code":"vi","sentence":"Tôi đang học tiếng Nhật"},{"language_code":"en","sentence":"I am studying Japanese"}]}]}'
      },
      { type: 'object', $ref: '#/components/schemas/TranslationsSwaggerDTO' }
    ],
    description: 'Các bản dịch nghĩa và ví dụ (có thể là JSON string hoặc object)'
  })
  translations: string | TranslationsSwaggerDTO
}

// Response DTOs for the redesigned structure
export class VocabularyDataSwaggerDTO {
  @ApiProperty({
    example: 6,
    description: 'ID của từ vựng'
  })
  id: number

  @ApiProperty({
    example: '日本語',
    description: 'Từ tiếng Nhật'
  })
  wordJp: string

  @ApiProperty({
    example: 'にほんご',
    description: 'Cách đọc (Hiragana)'
  })
  reading: string

  @ApiProperty({
    example: 5,
    description: 'Cấp độ JLPT (N5-N1)',
    required: false
  })
  levelN?: number

  @ApiProperty({
    example: 1,
    description: 'ID loại từ',
    required: false
  })
  wordTypeId?: number

  @ApiProperty({
    example: 1,
    description: 'ID người tạo',
    required: false
  })
  createdById?: number

  @ApiProperty({
    example:
      'https://res.cloudinary.com/dodtzdovx/image/upload/v1759606962/vocabulary/images/file_ghkhw2.webp',
    description: 'URL hình ảnh (có thể là null)',
    required: false,
    nullable: true
  })
  imageUrl?: string | null

  @ApiProperty({
    example:
      'https://res.cloudinary.com/dodtzdovx/video/upload/v1759606961/vocabulary/audio/file_yco4a0.mp3',
    description: 'URL âm thanh (có thể là null)',
    required: false,
    nullable: true
  })
  audioUrl?: string | null

  @ApiProperty({
    example: '2025-10-04T19:42:43.416Z',
    description: 'Thời gian tạo'
  })
  createdAt: Date

  @ApiProperty({
    example: '2025-10-04T19:42:43.416Z',
    description: 'Thời gian cập nhật'
  })
  updatedAt: Date
}

export class MeaningDataSwaggerDTO {
  @ApiProperty({
    example: 4,
    description: 'ID của meaning'
  })
  id: number

  @ApiProperty({
    type: [TranslationItemSwaggerDTO],
    description: 'Danh sách nghĩa theo ngôn ngữ'
  })
  translations: TranslationItemSwaggerDTO[]

  @ApiProperty({
    type: [ExampleTranslationSwaggerDTO],
    description: 'Danh sách ví dụ theo ngôn ngữ',
    required: false
  })
  examples?: ExampleTranslationSwaggerDTO[]
}

export class CreateVocabularyFullDataSwaggerDTO {
  @ApiProperty({
    type: VocabularyDataSwaggerDTO,
    description: 'Thông tin từ vựng'
  })
  vocabulary: VocabularyDataSwaggerDTO

  @ApiProperty({
    type: MeaningDataSwaggerDTO,
    description: 'Thông tin nghĩa và bản dịch'
  })
  meaning: MeaningDataSwaggerDTO

  @ApiProperty({
    example: 4,
    description: 'Số lượng translations đã tạo'
  })
  translationsCreated: number

  @ApiProperty({
    example: true,
    description: 'Có phải từ vựng mới tạo hay không'
  })
  isNew: boolean
}

export class CreateVocabularyFullResponseSwaggerDTO {
  @ApiProperty({
    type: CreateVocabularyFullDataSwaggerDTO,
    description: 'Dữ liệu response'
  })
  data: CreateVocabularyFullDataSwaggerDTO

  @ApiProperty({
    example: 'Tạo từ vựng thành công',
    description: 'Thông báo kết quả'
  })
  message: string
}

// Zod schemas for response
const VocabularyDataResponseSchema = z.object({
  id: z.number(),
  wordJp: z.string(),
  reading: z.string(),
  levelN: z.number().optional(),
  wordTypeId: z.number().optional(),
  createdById: z.number().optional(),
  imageUrl: z.string().nullable().optional(),
  audioUrl: z.string().nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date()
})

const MeaningDataResponseSchema = z.object({
  id: z.number(),
  translations: z.array(TranslationItemSchema),
  examples: z.array(ExampleTranslationSchema).optional()
})

const CreateVocabularyFullResponseSchema = z.object({
  data: z.object({
    vocabulary: VocabularyDataResponseSchema,
    meaning: MeaningDataResponseSchema,
    translationsCreated: z.number(),
    isNew: z.boolean()
  }),
  message: z.string()
})

// Zod DTOs for response
export class VocabularyDataResponseDTO extends createZodDto(
  VocabularyDataResponseSchema
) {}
export class MeaningDataResponseDTO extends createZodDto(MeaningDataResponseSchema) {}
export class CreateVocabularyFullResponseDTO extends createZodDto(
  CreateVocabularyFullResponseSchema
) {}

// Type exports
export type CreateVocabularyFullType = z.infer<typeof CreateVocabularyFullSchema>
export type TranslationItemType = z.infer<typeof TranslationItemSchema>
export type ExampleTranslationType = z.infer<typeof ExampleTranslationSchema>
export type TranslationsType = z.infer<typeof TranslationsSchema>
export type CreateVocabularyFullResponseType = z.infer<
  typeof CreateVocabularyFullResponseSchema
>
