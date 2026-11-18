import { checkIdSchema } from '@/common/utils/id.validation'
import { UserAnswerLogMessage as M } from '@/i18n/message-keys'
import { paginatedResSchema } from '@/shared/utils/pagination'
import { resSchema } from '@/shared/utils/res-schema'
import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'

extendZodWithOpenApi(z)
patchNestJsSwagger()

// UserAnswerLog schema
export const UserAnswerLogSchema = z.object({
  id: z.number(),
  isCorrect: z.boolean(),
  userExerciseAttemptId: z.number(),
  questionBankId: z.number(),
  answerId: z.number(),
  createdAt: z.date(),
  updatedAt: z.date()
})

const idOf = (key: string) =>
  z.number({ invalid_type_error: key, required_error: key }).int(key).positive(key)

export const CreateUserAnswerLogBodySchema = z
  .object({
    userExerciseAttemptId: idOf(M.INVALID_ATTEMPT_ID),
    questionBankId: idOf(M.INVALID_QUESTION_ID),
    answerId: idOf(M.INVALID_ANSWER_ID)
  })
  .strict()

export const UpdateUserAnswerLogBodySchema = UserAnswerLogSchema.pick({
  isCorrect: true
})
  .partial()
  .strict()

export const UserAnswerLogResSchema = resSchema(UserAnswerLogSchema).strict()

export const UserAnswerLogListResSchema = paginatedResSchema(UserAnswerLogSchema).strict()

export const GetUserAnswerLogByIdParamsSchema = z
  .object({
    id: checkIdSchema(M.INVALID_ID)
  })
  .strict()

export const GetUserAnswerLogListQuerySchema = z
  .object({
    currentPage: checkIdSchema(M.INVALID_PAGE).default(1),
    pageSize: checkIdSchema(M.INVALID_PAGE_SIZE).default(10),
    userExerciseAttemptId: checkIdSchema(M.INVALID_ATTEMPT_ID).optional(),
    questionBankId: checkIdSchema(M.INVALID_QUESTION_ID).optional(),
    isCorrect: z
      .enum(['true', 'false'], { errorMap: () => ({ message: M.INVALID_FLAG }) })
      .transform((val) => val === 'true')
      .optional()
  })
  .strict()

// Types
export type UserAnswerLog = z.infer<typeof UserAnswerLogSchema>
export type CreateUserAnswerLogBody = z.infer<typeof CreateUserAnswerLogBodySchema>
export type UpdateUserAnswerLogBody = z.infer<typeof UpdateUserAnswerLogBodySchema>
export type UserAnswerLogRes = z.infer<typeof UserAnswerLogResSchema>
export type UserAnswerLogListRes = z.infer<typeof UserAnswerLogListResSchema>
export type GetUserAnswerLogByIdParams = z.infer<typeof GetUserAnswerLogByIdParamsSchema>
export type GetUserAnswerLogListQuery = z.infer<typeof GetUserAnswerLogListQuerySchema>
