import { hasJapaneseText } from '@/common/utils/japanese-text'
import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { QuestionType, RoleSpeaking } from '@prisma/client'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'

extendZodWithOpenApi(z)
patchNestJsSwagger()

// Japanese text, or a blank to fill in (_ or the full-width ＿)
export const isQuestionText = (text: string) =>
  hasJapaneseText(text) || text.includes('_') || text.includes('＿')

// A SPEAKING question is read aloud: it needs its romaji pronunciation
export const lacksPronunciation = (data: {
  questionType?: QuestionType
  pronunciation?: string | null
}) => data.questionType === QuestionType.SPEAKING && !data.pronunciation?.trim()

// QuestionBank schema (updated to match new schema)
export const QuestionBankSchema = z.object({
  id: z.number(),
  questionJp: z.string().nullable().optional(),
  questionType: z.nativeEnum(QuestionType),
  audioUrl: z.string().url().nullable().optional(),
  questionKey: z.string().nullable().optional(),

  role: z.nativeEnum(RoleSpeaking).nullable().optional(),
  pronunciation: z.string().nullable().optional(),
  levelN: z.number().min(1).max(5).nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date()
})

// Types
export type QuestionBank = z.infer<typeof QuestionBankSchema>
