import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'
import { UserAnswerLogMessage as M } from '@/i18n/message-keys'
import { checkIdSchema } from '@/common/utils/id.validation'

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

export const UserAnswerLogResSchema = z
  .object({
    statusCode: z.number(),
    data: UserAnswerLogSchema,
    message: z.string()
  })
  .strict()

export const UserAnswerLogListResSchema = z
  .object({
    statusCode: z.number(),
    data: z.object({
      results: z.array(UserAnswerLogSchema),
      pagination: z.object({
        current: z.number(),
        pageSize: z.number(),
        totalPage: z.number(),
        totalItem: z.number()
      })
    }),
    message: z.string()
  })
  .strict()

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
export type UserAnswerLogType = z.infer<typeof UserAnswerLogSchema>
export type CreateUserAnswerLogBodyType = z.infer<typeof CreateUserAnswerLogBodySchema>
export type UpdateUserAnswerLogBodyType = z.infer<typeof UpdateUserAnswerLogBodySchema>
export type UserAnswerLogResType = z.infer<typeof UserAnswerLogResSchema>
export type UserAnswerLogListResType = z.infer<typeof UserAnswerLogListResSchema>
export type GetUserAnswerLogByIdParamsType = z.infer<
  typeof GetUserAnswerLogByIdParamsSchema
>
export type GetUserAnswerLogListQueryType = z.infer<
  typeof GetUserAnswerLogListQuerySchema
>
