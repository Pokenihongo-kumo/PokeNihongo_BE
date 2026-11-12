import { ApiProperty } from '@nestjs/swagger'
import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'
import { KanjiMessage as M } from '@/i18n/message-keys'
import { isKanjiCharacter } from '@/common/utils/japanese-text'

extendZodWithOpenApi(z)
patchNestJsSwagger()

// Custom validation functions

const isOnyomiKunyomi = (text: string): boolean => {
  const onyomiKunyomiRegex = /^[\u3040-\u309F\u30A0-\u30FF\s\-\.\,\!\?\'\"]+$/
  return onyomiKunyomiRegex.test(text)
}

const isValidReadingType = (readingType: string): boolean => {
  const validTypes = ['onyomi', 'kunyomi', 'nanori', 'irregular']
  return validTypes.includes(readingType.toLowerCase())
}

// Reading schema for kanji with readings
const ReadingSchema = z.object({
  readingType: z
    .string()
    .min(1, M.READING_TYPE_INVALID)
    .max(20, M.READING_TYPE_INVALID)
    .refine(isValidReadingType, M.READING_TYPE_INVALID),
  reading: z
    .string()
    .min(1, M.READING_INVALID)
    .max(100, M.READING_INVALID)
    .refine(isOnyomiKunyomi, M.READING_INVALID)
})

// Meaning schema for kanji with meanings
const MeaningSchema = z.object({
  translations: z
    .record(z.enum(['vi', 'en']), z.string())
    .optional()
    .describe(
      'Translations cho nghĩa này theo ngôn ngữ. Chỉ hỗ trợ: vi (Việt), en (Anh). Ví dụ: { "vi": "nghĩa tiếng Việt", "en": "English meaning" }'
    )
})

// Main schema for creating kanji with readings and meanings
export const CreateKanjiWithMeaningsSchema = z.object({
  // Exactly one kanji (was checked in the service, with a regex that also
  // accepted Latin-extended letters)
  character: z
    .string({ required_error: M.CHARACTER_REQUIRED })
    .min(1, M.CHARACTER_REQUIRED)
    .refine(isKanjiCharacter, M.CHARACTER_INVALID),
  strokeCount: z
    .union([z.number(), z.string()])
    .transform((val) => (typeof val === 'string' ? parseInt(val) : val))
    .refine((val) => val >= 1 && val <= 50, M.STROKE_COUNT_INVALID)
    .optional(),
  jlptLevel: z
    .union([z.number(), z.string()])
    .transform((val) => {
      if (typeof val === 'string') {
        return parseInt(val)
      }
      return val
    })
    .refine((val) => val >= 1 && val <= 5, M.JLPT_LEVEL_INVALID)
    .optional(),
  img: z.string().max(500, M.IMG_INVALID).url(M.IMG_INVALID).optional(),
  readings: z
    .union([z.array(ReadingSchema), z.string()])
    .transform((val) => {
      if (typeof val === 'string') {
        try {
          const parsed = JSON.parse(val)
          return Array.isArray(parsed) ? parsed : [parsed]
        } catch {
          // Nếu không phải JSON hợp lệ, coi như không hợp lệ để Zod báo lỗi
          return val
        }
      }
      return val
    })
    .pipe(z.array(ReadingSchema).min(1, M.READINGS_COUNT).max(10, M.READINGS_COUNT))
    .optional(),
  meanings: z
    .union([MeaningSchema, z.array(MeaningSchema), z.string()])
    .transform((val) => {
      if (typeof val === 'string') {
        try {
          const parsed = JSON.parse(val)
          return parsed
        } catch {
          return val
        }
      }
      return val
    })
    .pipe(z.union([MeaningSchema, z.array(MeaningSchema)]))
    .optional()
    .describe(
      'Meaning object hoặc array of meanings. Chỉ lấy meaning đầu tiên để tạo meaningKey chính.'
    )
})

// Response schema
export const KanjiWithMeaningsResponseSchema = z.object({
  kanji: z.object({
    id: z.number(),
    character: z.string(),
    meaningKey: z.string(),
    strokeCount: z.number().nullable(),
    jlptLevel: z.number().nullable(),
    img: z.string().nullable().optional(),
    createdAt: z.date(),
    updatedAt: z.date()
  }),
  readings: z
    .array(
      z.object({
        id: z.number(),
        kanjiId: z.number(),
        readingType: z.string(),
        reading: z.string(),
        createdAt: z.date(),
        updatedAt: z.date()
      })
    )
    .optional(),
  meanings: z.array(
    z.object({
      meaningKey: z.string(),
      translations: z.record(z.string(), z.string()).optional()
    })
  )
})

// Standard response schema
export const KanjiWithMeaningsResSchema = z
  .object({
    statusCode: z.number(),
    data: KanjiWithMeaningsResponseSchema,
    message: z.string()
  })
  .strict()

// Swagger DTOs
export class ReadingWithMeaningsSwaggerDTO {
  @ApiProperty({
    example: 'onyomi',
    description: 'Loại cách đọc (onyomi, kunyomi, nanori, irregular)',
    enum: ['onyomi', 'kunyomi', 'nanori', 'irregular']
  })
  readingType: string

  @ApiProperty({
    example: 'にち',
    description: 'Cách đọc cụ thể'
  })
  reading: string
}

export class MeaningWithTranslationsSwaggerDTO {
  @ApiProperty({
    example: { vi: 'mặt trời', en: 'sun' },
    description:
      'Translations cho nghĩa này theo ngôn ngữ. Chỉ hỗ trợ: vi (Việt), en (Anh)',
    required: false
  })
  translations?: Record<string, string>
}

export class CreateKanjiWithMeaningsSwaggerDTO {
  @ApiProperty({
    example: '日',
    description: 'Ký tự Kanji'
  })
  character: string

  @ApiProperty({
    example: 4,
    description: 'Số nét viết (có thể là số hoặc string)',
    required: false
  })
  strokeCount?: number | string

  @ApiProperty({
    example: 5,
    description: 'Cấp độ JLPT (1-5)',
    required: false
  })
  jlptLevel?: number | string

  @ApiProperty({
    example: 'https://example.com/images/kanji/sun.png',
    description: 'URL hình ảnh của Kanji (optional)',
    required: false
  })
  img?: string

  @ApiProperty({
    type: [ReadingWithMeaningsSwaggerDTO],
    description: 'Danh sách cách đọc của Kanji',
    required: false
  })
  readings?: ReadingWithMeaningsSwaggerDTO[]

  @ApiProperty({
    type: [MeaningWithTranslationsSwaggerDTO],
    description: 'Danh sách nghĩa của Kanji với translations',
    example: [
      {
        meaningKey: 'kanji.sun.meaning',
        exampleSentenceJp: '今日は良い天気です。',
        translations: {
          vi: 'mặt trời',
          en: 'sun',
          ja: '太陽'
        }
      }
    ]
  })
  @ApiProperty({
    description:
      'Meaning object hoặc array of meanings. Chỉ lấy meaning đầu tiên để tạo meaningKey chính.',
    oneOf: [
      { $ref: '#/components/schemas/MeaningWithTranslationsSwaggerDTO' },
      {
        type: 'array',
        items: { $ref: '#/components/schemas/MeaningWithTranslationsSwaggerDTO' }
      }
    ],
    required: false
  })
  meanings?: MeaningWithTranslationsSwaggerDTO | MeaningWithTranslationsSwaggerDTO[]
}

class KanjiWithMeaningsInfoSwaggerDTO {
  @ApiProperty({ example: 1, description: 'ID của Kanji' })
  id: number

  @ApiProperty({ example: '日', description: 'Ký tự Kanji' })
  character: string

  @ApiProperty({ example: 'kanji.sun.meaning', description: 'Key nghĩa chính' })
  meaningKey: string

  @ApiProperty({ example: 4, description: 'Số nét viết' })
  strokeCount: number | null

  @ApiProperty({ example: 5, description: 'Cấp độ JLPT' })
  jlptLevel: number | null

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Ngày tạo' })
  createdAt: Date

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Ngày cập nhật' })
  updatedAt: Date
}

class KanjiReadingWithMeaningsInfoSwaggerDTO {
  @ApiProperty({ example: 1, description: 'ID của cách đọc' })
  id: number

  @ApiProperty({ example: 1, description: 'ID của Kanji' })
  kanjiId: number

  @ApiProperty({ example: 'onyomi', description: 'Loại cách đọc' })
  readingType: string

  @ApiProperty({ example: 'にち', description: 'Cách đọc' })
  reading: string

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Ngày tạo' })
  createdAt: Date

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Ngày cập nhật' })
  updatedAt: Date
}

class KanjiMeaningInfoSwaggerDTO {
  @ApiProperty({
    example: 'kanji.1.meaning.1',
    description: 'Key nghĩa được tự động tạo'
  })
  meaningKey: string

  @ApiProperty({
    example: { vi: 'mặt trời', en: 'sun', ja: '太陽' },
    description: 'Translations cho nghĩa này theo ngôn ngữ',
    required: false
  })
  translations?: Record<string, string>
}

export class KanjiWithMeaningsResponseSwaggerDTO {
  @ApiProperty({
    type: KanjiWithMeaningsInfoSwaggerDTO,
    description: 'Thông tin Kanji đã tạo'
  })
  kanji: KanjiWithMeaningsInfoSwaggerDTO

  @ApiProperty({
    type: [KanjiReadingWithMeaningsInfoSwaggerDTO],
    description: 'Danh sách cách đọc đã tạo'
  })
  readings?: KanjiReadingWithMeaningsInfoSwaggerDTO[]

  @ApiProperty({
    type: [KanjiMeaningInfoSwaggerDTO],
    description: 'Danh sách nghĩa đã tạo'
  })
  meanings: KanjiMeaningInfoSwaggerDTO[]
}

// Type exports
export type CreateKanjiWithMeaningsBodyType = z.infer<
  typeof CreateKanjiWithMeaningsSchema
> & {
  meanings?: any[] | any | string // Allow array, object, or string for multipart/form-data
  readings?: any[] | string // Allow string for multipart/form-data
}
export type KanjiWithMeaningsResponseType = z.infer<
  typeof KanjiWithMeaningsResponseSchema
>
export type KanjiWithMeaningsResType = z.infer<typeof KanjiWithMeaningsResSchema>
export type ReadingWithMeaningsType = z.infer<typeof ReadingSchema>
export type MeaningWithTranslationsType = z.infer<typeof MeaningSchema>

// Zod DTOs for NestJS
export const CreateKanjiWithMeaningsBodyDTO = CreateKanjiWithMeaningsSchema
export const KanjiWithMeaningsResponseDTO = KanjiWithMeaningsResponseSchema
export const KanjiWithMeaningsResDTO = KanjiWithMeaningsResSchema
