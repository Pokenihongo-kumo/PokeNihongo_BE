import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'
import { ApiProperty } from '@nestjs/swagger'
import { createZodDto } from 'nestjs-zod'
import { KanjiSchema } from '../entities/kanji.entities'
import { KanjiReadingSchema } from '@/modules/kanji-reading/entities/kanji-reading.entity'

extendZodWithOpenApi(z)
patchNestJsSwagger()

// --- Zod Schemas ---

export const TranslationForMeaningUpdateSchema = z.object({
  languageCode: z.string().min(2).max(10),
  value: z.string().min(1).max(2000)
})

export const MeaningForKanjiUpdateSchema = z.object({
  id: z.number().optional(), // Nếu có id thì update, không có thì tạo mới
  meaningKey: z.string().min(1).max(500).optional(), // Optional - sẽ tự động generate nếu không có
  translations: z.record(z.string(), z.string()).optional() // { "vi": "nghĩa", "en": "meaning" }
})

export const UpdateKanjiWithMeaningsSchema = z.object({
  // meaningKey removed - tự động generate từ ID
  strokeCount: z.number().min(1).max(50).optional(),
  jlptLevel: z.number().min(1).max(5).optional(),
  readings: z
    .array(
      z.object({
        id: z.number().optional(), // Nếu có id thì update, không có thì tạo mới
        readingType: z.string().min(1).max(20),
        reading: z.string().min(1).max(100)
      })
    )
    .optional(),
  meanings: z.array(MeaningForKanjiUpdateSchema).optional()
})

export const UpdateKanjiWithMeaningsResponseSchema = z.object({
  kanji: KanjiSchema.optional(),
  readings: z.array(KanjiReadingSchema).optional(),
  meanings: z
    .array(
      z.object({
        id: z.number().optional(),
        meaningKey: z.string(),
        translations: z.record(z.string(), z.string()).optional()
      })
    )
    .optional()
})

export const UpdateKanjiWithMeaningsResSchema = z
  .object({
    statusCode: z.number(),
    data: UpdateKanjiWithMeaningsResponseSchema,
    message: z.string()
  })
  .strict()

// --- Swagger DTOs ---

class ReadingForUpdateSwaggerDTO {
  @ApiProperty({
    example: 1,
    description: 'ID của cách đọc (nếu có thì update, không có thì tạo mới)',
    required: false
  })
  id?: number

  @ApiProperty({
    example: 'onyomi',
    description: 'Loại cách đọc (onyomi, kunyomi, nanori, irregular)'
  })
  readingType: string

  @ApiProperty({ example: 'にち', description: 'Cách đọc cụ thể' })
  reading: string
}

class MeaningForKanjiUpdateSwaggerDTO {
  @ApiProperty({
    example: 1,
    description: 'ID của meaning (nếu có thì update, không có thì tạo mới)',
    required: false
  })
  id?: number

  @ApiProperty({
    example: 'kanji.day.meaning',
    description: 'Key dịch nghĩa (optional - sẽ tự động generate nếu không có)',
    required: false
  })
  meaningKey?: string

  @ApiProperty({
    example: { vi: 'rừng', en: 'forest', ja: '森' },
    description: 'Object chứa translations theo ngôn ngữ',
    required: false
  })
  translations?: Record<string, string>
}

export class UpdateKanjiWithMeaningsSwaggerDTO {
  // meaningKey removed - tự động generate từ ID

  @ApiProperty({ example: 12, description: 'Số nét viết', required: false })
  strokeCount?: number

  @ApiProperty({ example: 3, description: 'Cấp độ JLPT (N5-N1)', required: false })
  jlptLevel?: number

  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Upload hình ảnh mới cho Kanji (optional)',
    required: false
  })
  image?: any

  @ApiProperty({
    type: [ReadingForUpdateSwaggerDTO],
    description: 'Danh sách cách đọc của Kanji (có id thì update, không có thì tạo mới)',
    required: false
  })
  readings?: ReadingForUpdateSwaggerDTO[]

  @ApiProperty({
    type: [MeaningForKanjiUpdateSwaggerDTO],
    description: 'Danh sách các nghĩa của Kanji (có id thì update, không có thì tạo mới)',
    required: false
  })
  meanings?: MeaningForKanjiUpdateSwaggerDTO[]
}

class KanjiInfoSwaggerDTO {
  @ApiProperty({ example: 1, description: 'ID của Kanji' })
  id: number

  @ApiProperty({ example: '森', description: 'Ký tự Kanji' })
  character: string

  @ApiProperty({
    example: 'kanji.forest.main.meaning',
    description: 'Key dịch nghĩa Kanji'
  })
  meaningKey: string

  @ApiProperty({ example: 12, description: 'Số nét viết' })
  strokeCount: number | null

  @ApiProperty({ example: 3, description: 'Cấp độ JLPT' })
  jlptLevel: number | null

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Ngày tạo' })
  createdAt: Date

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Ngày cập nhật' })
  updatedAt: Date
}

class KanjiReadingInfoSwaggerDTO {
  @ApiProperty({ example: 1, description: 'ID của cách đọc' })
  id: number

  @ApiProperty({ example: 1, description: 'ID của Kanji' })
  kanjiId: number

  @ApiProperty({ example: 'onyomi', description: 'Loại cách đọc' })
  readingType: string

  @ApiProperty({ example: 'しん', description: 'Cách đọc' })
  reading: string

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Ngày tạo' })
  createdAt: Date

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Ngày cập nhật' })
  updatedAt: Date
}

class MeaningResponseSwaggerDTO {
  @ApiProperty({ example: 1, description: 'ID của meaning', required: false })
  id?: number

  @ApiProperty({ example: 'kanji.forest.main.meaning', description: 'Key dịch nghĩa' })
  meaningKey: string

  @ApiProperty({
    example: { vi: 'rừng', en: 'forest', ja: '森' },
    description: 'Object chứa translations theo ngôn ngữ',
    required: false
  })
  translations?: Record<string, string>
}

export class UpdateKanjiWithMeaningsResponseSwaggerDTO {
  @ApiProperty({ type: KanjiInfoSwaggerDTO, description: 'Thông tin Kanji đã cập nhật' })
  kanji: KanjiInfoSwaggerDTO

  @ApiProperty({
    type: [KanjiReadingInfoSwaggerDTO],
    description: 'Danh sách cách đọc đã cập nhật/tạo mới',
    required: false
  })
  readings?: KanjiReadingInfoSwaggerDTO[]

  @ApiProperty({
    type: [MeaningResponseSwaggerDTO],
    description: 'Danh sách các nghĩa đã cập nhật/tạo mới',
    required: false
  })
  meanings?: MeaningResponseSwaggerDTO[]
}

// Type exports
export type UpdateKanjiWithMeaningsBodyType = z.infer<
  typeof UpdateKanjiWithMeaningsSchema
>
export type UpdateKanjiWithMeaningsResponseType = z.infer<
  typeof UpdateKanjiWithMeaningsResponseSchema
>
export type UpdateKanjiWithMeaningsResType = z.infer<
  typeof UpdateKanjiWithMeaningsResSchema
>
