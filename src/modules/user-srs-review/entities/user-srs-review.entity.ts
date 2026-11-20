import { SrsReviewMessage as M } from '@/i18n/message-keys'
import { z } from 'zod'

export const SrsContentTypeEnum = z.enum(
  ['VOCABULARY', 'GRAMMAR', 'KANJI', 'TEST', 'EXERCISE'],
  { errorMap: () => ({ message: M.INVALID_CONTENT_TYPE }) }
)
