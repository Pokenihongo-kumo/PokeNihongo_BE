import { z } from 'zod'

export const SrsContentTypeEnum = z.enum([
  'VOCABULARY',
  'GRAMMAR',
  'KANJI',
  'TEST',
  'EXERCISE'
])

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
  contentId: z.number().int().positive(),
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
  dueOnly: z.boolean().optional()
})
export type ListSrsQuery = z.infer<typeof ListSrsQueryType>

export const ListSrsTodayQueryType = z.object({
  currentPage: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(200).optional()
})
export type ListSrsTodayQuery = z.infer<typeof ListSrsTodayQueryType>
