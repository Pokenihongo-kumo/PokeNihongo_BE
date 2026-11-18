import { checkIdSchema } from '@/common/utils/id.validation'
import { SrsReviewMessage as M } from '@/i18n/message-keys'
import { z } from 'zod'

export const SrsContentTypeEnum = z.enum(
  ['VOCABULARY', 'GRAMMAR', 'KANJI', 'TEST', 'EXERCISE'],
  { errorMap: () => ({ message: M.INVALID_CONTENT_TYPE }) }
)

export const UserSrsReviewSchema = z.object({
  id: z.number().int(),
  userId: z.number().int(),
  contentType: SrsContentTypeEnum,
  contentId: z.number().int(),
  message: z.string().nullable().optional(),
  srsLevel: z.number().int(),
  nextReviewDate: z.date(),
  incorrectStreak: z.number().int(),
  isLeech: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date()
})

export type SrsContentType = z.infer<typeof SrsContentTypeEnum>
export type UserSrsReview = z.infer<typeof UserSrsReviewSchema>

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

export const ReviewActionBodySchema = z.object({
  result: z.enum(['correct', 'incorrect']),
  message: z.string().optional()
})
export type ReviewActionBody = z.infer<typeof ReviewActionBodySchema>

export const ListSrsQuerySchema = z.object({
  type: SrsContentTypeEnum.optional(),
  // A query value is a string: z.boolean() refused "true" and "false"
  dueOnly: z
    .enum(['true', 'false'], { errorMap: () => ({ message: M.INVALID_FLAG }) })
    .transform((v) => v === 'true')
    .optional()
})
export type ListSrsQuery = z.infer<typeof ListSrsQuerySchema>

export const ListSrsTodayQuerySchema = z.object({
  currentPage: checkIdSchema(M.INVALID_PAGE).optional(),
  pageSize: checkIdSchema(M.INVALID_PAGE_SIZE).max(200, M.INVALID_PAGE_SIZE).optional()
})
export type ListSrsTodayQuery = z.infer<typeof ListSrsTodayQuerySchema>

export const SrsReviewIdParamsSchema = z.object({
  id: checkIdSchema(M.INVALID_ID)
})
