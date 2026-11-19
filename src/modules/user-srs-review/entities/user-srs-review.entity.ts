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

export type SrsContent = z.infer<typeof SrsContentTypeEnum>
export type UserSrsReview = z.infer<typeof UserSrsReviewSchema>
