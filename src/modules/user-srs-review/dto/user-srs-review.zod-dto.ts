import { paginatedResSchema } from '@/shared/utils/pagination'
import { resSchema } from '@/shared/utils/res-schema'
import { checkIdSchema } from '@/common/utils/id.validation'
import { SrsReviewMessage as M } from '@/i18n/message-keys'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import { SrsContentTypeEnum } from '../entities/user-srs-review.entity'

// Request/Query types

export const UpsertSrsReviewBodySchema = z.object({
  contentType: SrsContentTypeEnum,
  contentId: z
    .number({
      invalid_type_error: M.INVALID_CONTENT_ID,
      required_error: M.INVALID_CONTENT_ID
    })
    .int(M.INVALID_CONTENT_ID)
    .positive(M.INVALID_CONTENT_ID),
  message: z.string().optional()
})

export type UpsertSrsReviewBody = z.infer<typeof UpsertSrsReviewBodySchema>

export class UpsertSrsReviewBodyDTO extends createZodDto(UpsertSrsReviewBodySchema) {}

export const ReviewActionBodySchema = z.object({
  result: z.enum(['correct', 'incorrect']),
  message: z.string().optional()
})

export type ReviewActionBody = z.infer<typeof ReviewActionBodySchema>

export class ReviewActionBodyDTO extends createZodDto(ReviewActionBodySchema) {}

export const ListSrsQuerySchema = z.object({
  type: SrsContentTypeEnum.optional(),
  // A query value is a string: z.boolean() refused "true" and "false"
  dueOnly: z
    .enum(['true', 'false'], { errorMap: () => ({ message: M.INVALID_FLAG }) })
    .transform((v) => v === 'true')
    .optional()
})

export type ListSrsQuery = z.infer<typeof ListSrsQuerySchema>

export class ListSrsQueryDTO extends createZodDto(ListSrsQuerySchema) {}

export const ListSrsTodayQuerySchema = z.object({
  currentPage: checkIdSchema(M.INVALID_PAGE).optional(),
  pageSize: checkIdSchema(M.INVALID_PAGE_SIZE).max(200, M.INVALID_PAGE_SIZE).optional()
})

export type ListSrsTodayQuery = z.infer<typeof ListSrsTodayQuerySchema>

export class ListSrsTodayQueryDTO extends createZodDto(ListSrsTodayQuerySchema) {}

export const SrsReviewIdParamsSchema = z.object({
  id: checkIdSchema(M.INVALID_ID)
})

export type SrsReviewIdParams = z.infer<typeof SrsReviewIdParamsSchema>

export class SrsReviewIdParamsDTO extends createZodDto(SrsReviewIdParamsSchema) {}

// ---- responses (output only)

export const SrsReviewRowOutSchema = z.object({
  id: z.number(),
  userId: z.number(),
  message: z.string().nullable(),
  contentType: z.string(),
  contentId: z.number(),
  srsLevel: z.number(),
  nextReviewDate: z.date(),
  incorrectStreak: z.number(),
  isLeech: z.boolean(),
  isRead: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date()
})

export type SrsReviewRowOut = z.infer<typeof SrsReviewRowOutSchema>

export const SrsReviewResSchema = resSchema(SrsReviewRowOutSchema)

export type SrsReviewRes = z.infer<typeof SrsReviewResSchema>

export class SrsReviewResDTO extends createZodDto(SrsReviewResSchema) {}

export const SrsReviewListResSchema = paginatedResSchema(SrsReviewRowOutSchema)

export type SrsReviewListRes = z.infer<typeof SrsReviewListResSchema>

export class SrsReviewListResDTO extends createZodDto(SrsReviewListResSchema) {}

// The content a review points to, texts in the request language; null when gone
export const SrsContentOutSchema = z.union([
  z.object({
    type: z.literal('grammar'),
    id: z.number(),
    structure: z.string(),
    level: z.string(),
    usages: z.array(
      z.object({
        id: z.number(),
        explanation: z.string().nullable(),
        exampleSentence: z.string().nullable()
      })
    )
  }),
  z.object({
    type: z.literal('kanji'),
    id: z.number(),
    character: z.string(),
    meaning: z.string().nullable(),
    jlptLevel: z.number().nullable(),
    onReading: z.string(),
    kunReading: z.string()
  }),
  z.object({
    type: z.literal('vocabulary'),
    id: z.number(),
    wordJp: z.string(),
    reading: z.string(),
    meaning: z.string().nullable(),
    audioUrl: z.string().nullable(),
    imageUrl: z.string().nullable()
  }),
  z.object({ type: z.string(), id: z.number() })
])

export type SrsContentOut = z.infer<typeof SrsContentOutSchema>

export const SrsReviewTodayResSchema = paginatedResSchema(
  z.object({
    id: z.number(),
    userId: z.number(),
    message: z.string().nullable(),
    contentType: z.string(),
    contentId: z.number(),
    isRead: z.boolean(),
    content: SrsContentOutSchema.nullable()
  })
)

export type SrsReviewTodayRes = z.infer<typeof SrsReviewTodayResSchema>

export class SrsReviewTodayResDTO extends createZodDto(SrsReviewTodayResSchema) {}

export const SrsReviewDetailResSchema = resSchema(
  z.object({
    srs: z.object({
      id: z.number(),
      userId: z.number(),
      message: z.string().nullable(),
      srsLevel: z.number(),
      incorrectStreak: z.number(),
      isLeech: z.boolean(),
      isRead: z.boolean()
    }),
    content: SrsContentOutSchema.nullable()
  })
)

export type SrsReviewDetailRes = z.infer<typeof SrsReviewDetailResSchema>

export class SrsReviewDetailResDTO extends createZodDto(SrsReviewDetailResSchema) {}
