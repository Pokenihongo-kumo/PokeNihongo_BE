import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'

extendZodWithOpenApi(z)
patchNestJsSwagger()

// Answer Entity Types
export const AnswerSchema = z.object({
  id: z.number(),
  answerJp: z.string(),
  answerKey: z.string(),
  isCorrect: z.boolean(),
  questionBankId: z.number(),
  createdAt: z.date(),
  updatedAt: z.date()
})

// Answer with translation for list (without answerKey)
export const AnswerWithTranslationSchema = AnswerSchema.omit({ answerKey: true })
  .extend({
    meaning: z.string().optional(),
    meanings: z
      .array(
        z.object({
          language: z.string(),
          value: z.string()
        })
      )
      .optional(),
    // Parsed fields from combined format "jp:...+vi:...+en:..." (optional)
    answerVi: z.string().optional(),
    answerEn: z.string().optional(),
    questionBank: z
      .object({
        id: z.number(),
        questionJp: z.string(),
        questionKey: z.string().nullable().optional()
      })
      .optional()
  })
  .strict()

// Type exports
export type Answer = z.infer<typeof AnswerSchema>
export type AnswerWithTranslation = z.infer<typeof AnswerWithTranslationSchema>
