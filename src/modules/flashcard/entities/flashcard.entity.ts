import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'

extendZodWithOpenApi(z)
patchNestJsSwagger()

export const FlashcardDeckStatusEnum = z.enum(['ACTIVE', 'ARCHIVED'])
export const FlashcardDeckSourceEnum = z.enum(['SYSTEM', 'USER'])
export const FlashcardCardStatusEnum = z.enum(['ACTIVE', 'ARCHIVED'])
export const FlashcardContentTypeEnum = z.enum([
  'VOCABULARY',
  'KANJI',
  'GRAMMAR',
  'CUSTOM'
])
export const FlashcardImportContentTypeEnum = z.enum(['VOCABULARY', 'KANJI', 'GRAMMAR'])

export const JsonRecordSchema = z.record(z.any()).optional().nullable()

export const FlashcardDeckBaseSchema = z.object({
  id: z.number(),
  userId: z.number(),
  name: z.string(),
  status: FlashcardDeckStatusEnum,
  source: FlashcardDeckSourceEnum,
  metadata: JsonRecordSchema,
  deletedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date()
})

export const FlashcardVocabularySummarySchema = z.object({
  id: z.number(),
  wordJp: z.string(),
  reading: z.string().nullable(),
  levelN: z.number().nullable(),
  audioUrl: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  meanings: z.string().nullable()
})

export const FlashcardKanjiSummarySchema = z.object({
  id: z.number(),
  character: z.string(),
  meaningKey: z.string(),
  jlptLevel: z.number().nullable(),
  img: z.string().nullable().optional()
})

export const FlashcardGrammarSummarySchema = z.object({
  id: z.number(),
  structure: z.string(),
  level: z.string().nullable()
})

export const FlashcardCardSchema = z.object({
  id: z.number(),
  deckId: z.number(),
  contentType: FlashcardContentTypeEnum,
  status: FlashcardCardStatusEnum,
  vocabularyId: z.number().nullable(),
  kanjiId: z.number().nullable(),
  grammarId: z.number().nullable(),
  vocabulary: FlashcardVocabularySummarySchema.nullable(),
  kanji: FlashcardKanjiSummarySchema.nullable(),
  grammar: FlashcardGrammarSummarySchema.nullable(),
  notes: z.string().nullable(),
  read: z.boolean(),
  deletedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date()
})

export const FlashcardDeckSummarySchema = FlashcardDeckBaseSchema.extend({
  totalCards: z.number()
})

export const FlashcardDeckDetailSchema = FlashcardDeckSummarySchema.extend({
  cards: z.array(FlashcardCardSchema).optional()
})

export const CreateFlashcardDeckBodySchema = z.object({
  name: z.string().trim().min(1).max(200),
  metadata: JsonRecordSchema
})

export const UpdateFlashcardDeckBodySchema =
  CreateFlashcardDeckBodySchema.partial().refine((data) => Object.keys(data).length > 0, {
    message: 'Ít nhất phải cập nhật một trường'
  })

export const GetFlashcardDeckListQuerySchema = z.object({
  currentPage: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().optional(),
  status: FlashcardDeckStatusEnum.optional()
})

export const FlashcardDeckParamsSchema = z.object({
  deckId: z.coerce.number().int().min(1)
})

export const FlashcardDeckCardParamsSchema = FlashcardDeckParamsSchema.extend({
  cardId: z.coerce.number().int().min(1)
})

export const CreateFlashcardCardBodySchema = z
  .object({
    id: z.preprocess(
      (val) => {
        // Nếu không truyền field hoặc rỗng, return null
        if (val === undefined || val === '' || val === null) return null
        const num = Number(val)
        return isNaN(num) ? null : num
      },
      z.union([z.number().int().min(1), z.null()]).default(null)
    ),
    contentType: FlashcardContentTypeEnum,
    notes: z.string().trim().max(4000).optional(),
    metadata: JsonRecordSchema
  })
  .superRefine((data, ctx) => {
    const { contentType, id, metadata } = data

    if (contentType === 'CUSTOM') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'CUSTOM không được hỗ trợ',
        path: ['contentType']
      })
      return
    }

    // Nếu không có id, phải có metadata để user tự tạo card riêng
    if (!id || id === null || id === undefined) {
      if (
        !metadata ||
        metadata === null ||
        metadata === undefined ||
        Object.keys(metadata).length === 0
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Khi không có id, phải cung cấp metadata để tạo card tùy chỉnh',
          path: ['metadata']
        })
      }
    } else {
      // Nếu có id, validate id phải là số nguyên dương hợp lệ
      if (!Number.isInteger(id) || id < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Cần cung cấp id hợp lệ (số nguyên dương) tương ứng với contentType',
          path: ['id']
        })
      }
    }
  })

export const UpdateFlashcardCardBodySchema = z
  .object({
    deckId: z.coerce.number().int().min(1),
    cardId: z.coerce.number().int().min(1),
    contentType: FlashcardContentTypeEnum.optional(),
    status: FlashcardCardStatusEnum.optional(),
    notes: z.string().trim().max(4000).nullable().optional(),
    read: z.boolean().optional(),
    metadata: JsonRecordSchema
  })
  .refine(
    (value) => {
      const updateFields = ['contentType', 'status', 'notes', 'read', 'metadata']
      return updateFields.some((field) => value[field] !== undefined)
    },
    {
      message:
        'Ít nhất phải cập nhật một trường (contentType, status, notes, read, hoặc metadata)'
    }
  )

export const GetFlashcardCardListQuerySchema = z.object({
  currentPage: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).default(10),
  contentType: FlashcardContentTypeEnum.optional(),
  search: z.string().trim().optional()
})

export const FlashcardLibrarySearchQuerySchema = z.object({
  type: FlashcardImportContentTypeEnum.default('VOCABULARY'),
  currentPage: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().optional(),
  jlptLevel: z.coerce.number().int().min(1).max(5).optional(),
  level: z.string().trim().optional()
})

export const FlashcardImportItemSchema = z.object({
  contentType: FlashcardImportContentTypeEnum,
  contentId: z.number().int().min(1)
})

export const ImportFlashcardCardsBodySchema = z.object({
  items: z.array(FlashcardImportItemSchema).min(1, 'Cần ít nhất một phần tử để import')
})

export const FlashcardImportResultSchema = z.object({
  imported: z.number(),
  skipped: z.number(),
  missing: z.number(),
  duplicates: z.array(
    z.object({
      contentType: FlashcardImportContentTypeEnum,
      contentId: z.number()
    })
  )
})

export const FlashcardLibraryItemSchema = z.object({
  contentType: FlashcardImportContentTypeEnum,
  contentId: z.number(),
  title: z.string(),
  subtitle: z.string().nullable(),
  jlptLevel: z.number().nullable(),
  payload: JsonRecordSchema,
  isAdded: z.boolean()
})

export const FlashcardReviewQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20)
})

export const FlashcardReadBodySchema = z.object({
  deckId: z.coerce.number().int().min(1),
  cardId: z.coerce.number().int().min(1),
  read: z.boolean()
})

export const FlashcardReviewActionBodySchema = z.object({
  deckId: z.coerce.number().int().min(1),
  cardId: z.coerce.number().int().min(1),
  result: z.enum(['correct', 'incorrect']),
  message: z.string().trim().max(1000).optional()
})

export const FlashcardReviewItemSchema = FlashcardCardSchema.extend({
  srs: z
    .object({
      id: z.number(),
      srsLevel: z.number(),
      nextReviewDate: z.date(),
      incorrectStreak: z.number(),
      isLeech: z.boolean(),
      message: z.string().nullable()
    })
    .nullable()
    .optional()
})

export const DeleteFlashcardCardsBodySchema = z.object({
  deckId: z.coerce.number().int().min(1),
  cardIds: z.array(z.coerce.number().int().min(1)).min(1)
})

export type FlashcardDeckStatus = z.infer<typeof FlashcardDeckStatusEnum>
export type FlashcardDeckSource = z.infer<typeof FlashcardDeckSourceEnum>
export type FlashcardCardStatus = z.infer<typeof FlashcardCardStatusEnum>
export type FlashcardContentType = z.infer<typeof FlashcardContentTypeEnum>
export type FlashcardDeckSummary = z.infer<typeof FlashcardDeckSummarySchema>
export type FlashcardDeckDetail = z.infer<typeof FlashcardDeckDetailSchema>
export type FlashcardCard = z.infer<typeof FlashcardCardSchema>
export type CreateFlashcardDeckBody = z.infer<typeof CreateFlashcardDeckBodySchema>
export type UpdateFlashcardDeckBody = z.infer<typeof UpdateFlashcardDeckBodySchema>
export type GetFlashcardDeckListQuery = z.infer<typeof GetFlashcardDeckListQuerySchema>
export type FlashcardDeckParams = z.infer<typeof FlashcardDeckParamsSchema>
export type FlashcardDeckCardParams = z.infer<typeof FlashcardDeckCardParamsSchema>
export type CreateFlashcardCardBody = z.infer<typeof CreateFlashcardCardBodySchema>
export type UpdateFlashcardCardBody = z.infer<typeof UpdateFlashcardCardBodySchema>
export type GetFlashcardCardListQuery = z.infer<typeof GetFlashcardCardListQuerySchema>
export type ImportFlashcardCardsBody = z.infer<typeof ImportFlashcardCardsBodySchema>
export type FlashcardImportResult = z.infer<typeof FlashcardImportResultSchema>
export type FlashcardLibrarySearchQuery = z.infer<
  typeof FlashcardLibrarySearchQuerySchema
>
export type FlashcardLibraryItem = z.infer<typeof FlashcardLibraryItemSchema>
export type FlashcardReviewQuery = z.infer<typeof FlashcardReviewQuerySchema>
export type FlashcardReviewActionBody = z.infer<typeof FlashcardReviewActionBodySchema>
export type FlashcardReviewItem = z.infer<typeof FlashcardReviewItemSchema>
export type DeleteFlashcardCardsBody = z.infer<typeof DeleteFlashcardCardsBodySchema>
export type FlashcardReadBody = z.infer<typeof FlashcardReadBodySchema>
