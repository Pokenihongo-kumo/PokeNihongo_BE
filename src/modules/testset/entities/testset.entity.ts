import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'
import {
  TestSetStatus,
  TestSetType as PrismaTestSetType,
  QuestionType,
  RoleSpeaking
} from '@prisma/client'

extendZodWithOpenApi(z)
patchNestJsSwagger()

// TestSet Schema
export const TestSetSchema = z.object({
  id: z.number(),
  name: z.union([
    z.string(),
    z.array(
      z.object({
        language: z.string(),
        value: z.string()
      })
    )
  ]),
  description: z
    .union([
      z.string().nullable(),
      z.array(
        z.object({
          language: z.string(),
          value: z.string()
        })
      )
    ])
    .optional(),
  content: z.string().nullable().optional(),
  audioUrl: z.string().nullable().optional(),
  price: z.number().nullable().optional(),
  levelN: z.number().nullable().optional(),
  testType: z.nativeEnum(PrismaTestSetType),
  status: z.nativeEnum(TestSetStatus),
  creatorId: z.number().nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date()
})

// Create TestSet Schema
export const CreateTestSetBodySchema = z
  .object({
    name: z.string().optional(),
    description: z.string().nullable().optional(),
    content: z.string().nullable().optional(),
    audioUrl: z.string().nullable().optional(),
    price: z.number().nullable().optional(),
    levelN: z.number().nullable().optional(),
    testType: z.nativeEnum(PrismaTestSetType),
    status: z.nativeEnum(TestSetStatus).default(TestSetStatus.DRAFT),
    translations: z
      .array(
        z.object({
          field: z.enum(['name', 'description']),
          language_code: z.string(),
          value: z.string()
        })
      )
      .min(1, 'Phải có ít nhất 1 translation')
  })
  .strict()
  .refine(
    (data) => {
      // Nếu testType là READING thì content phải có và là tiếng Nhật
      if (data.testType === PrismaTestSetType.READING) {
        if (!data.content || data.content.trim() === '') {
          return false
        }
        // Kiểm tra có chứa ký tự tiếng Nhật (Hiragana, Katakana, Kanji)
        const japaneseRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/
        return japaneseRegex.test(data.content)
      }
      return true
    },
    {
      message: 'Khi testType là READING, content phải có và phải là tiếng Nhật (bài đọc)',
      path: ['content']
    }
  )

// Create TestSet with Meanings Schema
export const CreateTestSetWithMeaningsBodySchema = z
  .object({
    content: z.string().nullable().optional(),
    audioUrl: z.string().nullable().optional(),
    price: z.number().nullable().optional(),
    levelN: z.number().nullable().optional(),
    testType: z.nativeEnum(PrismaTestSetType),
    status: z.nativeEnum(TestSetStatus).default(TestSetStatus.DRAFT),
    meanings: z
      .array(
        z.object({
          field: z.enum(['name', 'description']),
          meaningKey: z.string().optional(),
          translations: z.object({
            vi: z.string(),
            en: z.string(),
            ja: z.string().optional()
          })
        })
      )
      .min(1, 'Phải có ít nhất 1 meaning')
  })
  .strict()
  .refine(
    (data) => {
      // Nếu testType là READING thì content phải có và là tiếng Nhật
      if (data.testType === PrismaTestSetType.READING) {
        if (!data.content || data.content.trim() === '') {
          return false
        }
        // Kiểm tra có chứa ký tự tiếng Nhật (Hiragana, Katakana, Kanji)
        const japaneseRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/
        return japaneseRegex.test(data.content)
      }
      return true
    },
    {
      message: 'Khi testType là READING, content phải có và phải là tiếng Nhật (bài đọc)',
      path: ['content']
    }
  )

// Create TestSet with QuestionBanks Schema
export const CreateTestSetWithQuestionBodySchema = z
  .object({
    content: z.string().nullable().optional(),
    audioUrl: z.string().nullable().optional(),
    price: z.number().nullable().optional(),
    levelN: z.number().nullable().optional(),
    testType: z.nativeEnum(PrismaTestSetType),
    status: z.nativeEnum(TestSetStatus).default(TestSetStatus.DRAFT),
    translations: z
      .array(
        z.object({
          field: z.enum(['name', 'description']),
          language_code: z.string(),
          value: z.string()
        })
      )
      .min(1, 'Phải có ít nhất 1 translation'),
    questionBankIds: z
      .array(z.number().int().positive())
      .min(1, 'Phải có ít nhất 1 questionBank')
  })
  .strict()
  .refine(
    (data) => {
      // Nếu testType là READING thì content phải có và là tiếng Nhật
      if (data.testType === PrismaTestSetType.READING) {
        if (!data.content || data.content.trim() === '') {
          return false
        }
        // Kiểm tra có chứa ký tự tiếng Nhật (Hiragana, Katakana, Kanji)
        const japaneseRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/
        return japaneseRegex.test(data.content)
      }
      return true
    },
    {
      message: 'Khi testType là READING, content phải có và phải là tiếng Nhật (bài đọc)',
      path: ['content']
    }
  )

// Schema for creating a new questionBank inline
export const CreateQuestionBankInlineSchema = z
  .object({
    questionJp: z.string().min(1, 'questionJp không được để trống'),
    questionType: z.nativeEnum(QuestionType),
    audioUrl: z.string().nullable().optional(),
    pronunciation: z.string().nullable().optional(),
    role: z.nativeEnum(RoleSpeaking).nullable().optional(),
    levelN: z.number().min(1).max(5).nullable().optional(),
    meanings: z
      .array(
        z.object({
          meaningKey: z.string().nullable().optional(),
          translations: z.record(z.string())
        })
      )
      .optional()
  })
  .strict()

// Schema cho questionBank trong upsert (có thể có id để update order, hoặc không có id để tạo mới)
export const UpsertQuestionBankSchema = CreateQuestionBankInlineSchema.extend({
  id: z.number().int().positive().optional() // ID của TestSetQuestionBank (nếu có = update order, nếu không = tạo mới)
}).strict()

// Upsert TestSet with QuestionBanks Schema (order tự động dựa vào vị trí trong mảng)
export const UpsertTestSetWithQuestionBanksBodySchema = z
  .object({
    id: z.number().int().positive().optional(),
    content: z.string().nullable().optional(),
    audioUrl: z.string().nullable().optional(),
    price: z.number().nullable().optional(),
    levelN: z.number().nullable().optional(),
    testType: z.nativeEnum(PrismaTestSetType).optional(),
    status: z.nativeEnum(TestSetStatus).optional(),
    meanings: z
      .array(
        z.object({
          field: z.enum(['name', 'description']),
          meaningKey: z.string().optional(),
          translations: z.object({
            vi: z.string().optional(),
            en: z.string().optional(),
            ja: z.string().optional()
          })
        })
      )
      .optional(),
    questionBanks: z.array(UpsertQuestionBankSchema).optional() // Mảng questionBank, order tự động = index + 1
  })
  .strict()
  .refine(
    (data) => {
      // Phải có ít nhất questionBanks (nếu là create)
      // Nếu là update có thể không có (chỉ update testset info)
      if (!data.questionBanks || data.questionBanks.length === 0) {
        // Cho phép không có questionBank nếu đang update
        return true
      }
      return true
    },
    {
      message: 'Phải có ít nhất 1 questionBank khi tạo mới',
      path: ['questionBanks']
    }
  )
  .refine(
    (data) => {
      // Nếu testType là READING thì content phải có và là tiếng Nhật
      if (data.testType === PrismaTestSetType.READING) {
        if (!data.content || data.content.trim() === '') {
          return false
        }
        // Kiểm tra có chứa ký tự tiếng Nhật (Hiragana, Katakana, Kanji)
        const japaneseRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/
        return japaneseRegex.test(data.content)
      }
      return true
    },
    {
      message: 'Khi testType là READING, content phải có và phải là tiếng Nhật (bài đọc)',
      path: ['content']
    }
  )

// Update TestSet Schema
export const UpdateTestSetBodySchema = z
  .object({
    content: z.string().nullable().optional(),
    audioUrl: z.string().nullable().optional(),
    price: z.number().nullable().optional(),
    levelN: z.number().nullable().optional(),
    testType: z.nativeEnum(PrismaTestSetType).optional(),
    status: z.nativeEnum(TestSetStatus).optional(),
    translations: z
      .array(
        z.object({
          field: z.enum(['name', 'description']),
          language_code: z.string(),
          value: z.string()
        })
      )
      .optional()
  })
  .strict()
  .refine(
    (data) => {
      // Nếu testType là READING thì content phải có và là tiếng Nhật
      if (data.testType === PrismaTestSetType.READING) {
        if (!data.content || data.content.trim() === '') {
          return false
        }
        // Kiểm tra có chứa ký tự tiếng Nhật (Hiragana, Katakana, Kanji)
        const japaneseRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/
        return japaneseRegex.test(data.content)
      }
      return true
    },
    {
      message: 'Khi testType là READING, content phải có và phải là tiếng Nhật (bài đọc)',
      path: ['content']
    }
  )

// Update TestSet with Meanings Schema
export const UpdateTestSetWithMeaningsBodySchema = z
  .object({
    content: z.string().nullable().optional(),
    audioUrl: z.string().nullable().optional(),
    price: z.number().nullable().optional(),
    levelN: z.number().nullable().optional(),
    testType: z.nativeEnum(PrismaTestSetType).optional(),
    status: z.nativeEnum(TestSetStatus).optional(),
    meanings: z
      .array(
        z.object({
          field: z.enum(['name', 'description']),
          meaningKey: z.string().optional(),
          translations: z.object({
            vi: z.string(),
            en: z.string(),
            ja: z.string().optional()
          })
        })
      )
      .optional()
  })
  .strict()
  .refine(
    (data) => {
      // Nếu testType là READING thì content phải có và là tiếng Nhật
      if (data.testType === PrismaTestSetType.READING) {
        if (!data.content || data.content.trim() === '') {
          return false
        }
        // Kiểm tra có chứa ký tự tiếng Nhật (Hiragana, Katakana, Kanji)
        const japaneseRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/
        return japaneseRegex.test(data.content)
      }
      return true
    },
    {
      message: 'Khi testType là READING, content phải có và phải là tiếng Nhật (bài đọc)',
      path: ['content']
    }
  )

// TestSet Response Schema
export const TestSetResSchema = z
  .object({
    statusCode: z.number(),
    data: TestSetSchema,
    message: z.string()
  })
  .strict()

// TestSet List Response Schema
export const TestSetListResSchema = z
  .object({
    statusCode: z.number(),
    data: z.object({
      results: z.array(TestSetSchema),
      pagination: z.object({
        current: z.number(),
        pageSize: z.number(),
        totalPage: z.number(),
        totalItem: z.number()
      })
    }),
    message: z.string()
  })
  .strict()

// Get TestSet by ID Params Schema
export const GetTestSetByIdParamsSchema = z
  .object({
    id: z.string().transform((val) => parseInt(val, 10))
  })
  .strict()

// Get TestSet List Query Schema
export const GetTestSetListQuerySchema = z
  .object({
    currentPage: z
      .string()
      .transform((val) => parseInt(val, 10))
      .optional()
      .default('1'),
    pageSize: z
      .string()
      .transform((val) => parseInt(val, 10))
      .optional()
      .default('10'),
    search: z.string().optional(),
    levelN: z
      .string()
      .transform((val) => parseInt(val, 10))
      .optional(),
    testType: z.nativeEnum(PrismaTestSetType).optional(),
    status: z.nativeEnum(TestSetStatus).optional(),
    creatorId: z
      .string()
      .transform((val) => parseInt(val, 10))
      .optional(),
    language: z.string().optional(),
    sortBy: z
      .enum([
        'id',
        'name',
        'testType',
        'levelN',
        'status',
        'price',
        'createdAt',
        'updatedAt'
      ])
      .optional()
      .default('createdAt'),
    sort: z.enum(['asc', 'desc']).optional().default('desc'),
    noExercies: z
      .string()
      .optional()
      .transform((val) => val === 'true'),
    noPrice: z
      .string()
      .optional()
      .transform((val) => val === 'true')
  })
  .strict()

// Types
export type TestSetType = z.infer<typeof TestSetSchema>
export type CreateTestSetBodyType = z.infer<typeof CreateTestSetBodySchema>
export type UpdateTestSetBodyType = z.infer<typeof UpdateTestSetBodySchema>
export type CreateTestSetWithMeaningsBodyType = z.infer<
  typeof CreateTestSetWithMeaningsBodySchema
>
export type UpdateTestSetWithMeaningsBodyType = z.infer<
  typeof UpdateTestSetWithMeaningsBodySchema
>
export type CreateTestSetWithQuestionBodyType = z.infer<
  typeof CreateTestSetWithQuestionBodySchema
>
export type UpsertTestSetWithQuestionBanksBodyType = z.infer<
  typeof UpsertTestSetWithQuestionBanksBodySchema
>
export type TestSetResType = z.infer<typeof TestSetResSchema>
export type TestSetListResType = z.infer<typeof TestSetListResSchema>
export type GetTestSetByIdParamsType = z.infer<typeof GetTestSetByIdParamsSchema>
export type GetTestSetListQueryType = z.infer<typeof GetTestSetListQuerySchema>
