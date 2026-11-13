import { z } from 'zod'
import { SrsReviewMessage as M } from '@/i18n/message-keys'
import { checkIdSchema } from '@/common/utils/id.validation'

export const SrsContentTypeEnum = z.enum(
  ['VOCABULARY', 'GRAMMAR', 'KANJI', 'TEST', 'EXERCISE'],
  { errorMap: () => ({ message: M.INVALID_CONTENT_TYPE }) }
)

export const UserSrsReviewType = z.object({
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
export type UserSrsReview = z.infer<typeof UserSrsReviewType>

// Request/Query types
export const UpsertSrsReviewBodyType = z.object({
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
export type UpsertSrsReviewBody = z.infer<typeof UpsertSrsReviewBodyType>

export const ReviewActionBodyType = z.object({
  result: z.enum(['correct', 'incorrect']),
  message: z.string().optional()
})
export type ReviewActionBody = z.infer<typeof ReviewActionBodyType>

export const ListSrsQueryType = z.object({
  type: SrsContentTypeEnum.optional(),
  // A query value is a string: z.boolean() refused "true" and "false"
  dueOnly: z
    .enum(['true', 'false'], { errorMap: () => ({ message: M.INVALID_FLAG }) })
    .transform((v) => v === 'true')
    .optional()
})
export type ListSrsQuery = z.infer<typeof ListSrsQueryType>

export const ListSrsTodayQueryType = z.object({
  currentPage: checkIdSchema(M.INVALID_PAGE).optional(),
  pageSize: checkIdSchema(M.INVALID_PAGE_SIZE).max(200, M.INVALID_PAGE_SIZE).optional()
})
export type ListSrsTodayQuery = z.infer<typeof ListSrsTodayQueryType>

export const SrsReviewIdParamsType = z.object({
  id: checkIdSchema(M.INVALID_ID)
})
