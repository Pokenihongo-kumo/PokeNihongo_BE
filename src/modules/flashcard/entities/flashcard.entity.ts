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

export const FlashcardImportItemSchema = z.object({
  contentType: FlashcardImportContentTypeEnum,
  contentId: z.number().int().min(1)
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

export type FlashcardDeckStatus = z.infer<typeof FlashcardDeckStatusEnum>
export type FlashcardDeckSource = z.infer<typeof FlashcardDeckSourceEnum>
export type FlashcardCardStatus = z.infer<typeof FlashcardCardStatusEnum>
export type FlashcardContent = z.infer<typeof FlashcardContentTypeEnum>
export type FlashcardDeckSummary = z.infer<typeof FlashcardDeckSummarySchema>
export type FlashcardDeckDetail = z.infer<typeof FlashcardDeckDetailSchema>
export type FlashcardCard = z.infer<typeof FlashcardCardSchema>
export type FlashcardImportResult = z.infer<typeof FlashcardImportResultSchema>
export type FlashcardLibraryItem = z.infer<typeof FlashcardLibraryItemSchema>
export type FlashcardReviewItem = z.infer<typeof FlashcardReviewItemSchema>
