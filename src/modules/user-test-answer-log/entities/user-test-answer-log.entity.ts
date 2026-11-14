import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'
import { UserTestAnswerLogMessage as M } from '@/i18n/message-keys'
import { checkIdSchema } from '@/common/utils/id.validation'

extendZodWithOpenApi(z)
patchNestJsSwagger()

// UserTestAnswerLog schema
export const UserTestAnswerLogSchema = z.object({
  id: z.number(),
  isCorrect: z.boolean(),
  userTestAttemptId: z.number(),
  questionBankId: z.number(),
  answerId: z.number(),
  createdAt: z.date(),
  updatedAt: z.date()
})

const idOf = (key: string) =>
  z.number({ invalid_type_error: key, required_error: key }).int(key).positive(key)

export const CreateUserTestAnswerLogBodySchema = z
  .object({
    userTestAttemptId: idOf(M.INVALID_ATTEMPT_ID),
    questionBankId: idOf(M.INVALID_QUESTION_ID),
    answerId: idOf(M.INVALID_ANSWER_ID)
  })
  .strict()

export const UpdateUserTestAnswerLogBodySchema = UserTestAnswerLogSchema.pick({
  isCorrect: true
})
  .partial()
  .strict()

export const UserTestAnswerLogResSchema = z
  .object({
    statusCode: z.number(),
    data: UserTestAnswerLogSchema,
    message: z.string()
  })
  .strict()

export const UserTestAnswerLogListResSchema = z
  .object({
    statusCode: z.number(),
    data: z.object({
      results: z.array(UserTestAnswerLogSchema),
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

export const GetUserTestAnswerLogByIdParamsSchema = z
  .object({
    id: checkIdSchema(M.INVALID_ID)
  })
  .strict()

export const GetUserTestAnswerLogListQuerySchema = z
  .object({
    currentPage: checkIdSchema(M.INVALID_PAGE).default(1),
    pageSize: checkIdSchema(M.INVALID_PAGE_SIZE).default(10),
    userTestAttemptId: checkIdSchema(M.INVALID_ATTEMPT_ID).optional(),
    questionBankId: checkIdSchema(M.INVALID_QUESTION_ID).optional(),
    isCorrect: z
      .enum(['true', 'false'], { errorMap: () => ({ message: M.INVALID_FLAG }) })
      .transform((val) => val === 'true')
      .optional()
  })
  .strict()

// Types
export type UserTestAnswerLogType = z.infer<typeof UserTestAnswerLogSchema>
export type CreateUserTestAnswerLogBodyType = z.infer<
  typeof CreateUserTestAnswerLogBodySchema
>
export type UpdateUserTestAnswerLogBodyType = z.infer<
  typeof UpdateUserTestAnswerLogBodySchema
>
export type UserTestAnswerLogResType = z.infer<typeof UserTestAnswerLogResSchema>
export type UserTestAnswerLogListResType = z.infer<typeof UserTestAnswerLogListResSchema>
export type GetUserTestAnswerLogByIdParamsType = z.infer<
  typeof GetUserTestAnswerLogByIdParamsSchema
>
export type GetUserTestAnswerLogListQueryType = z.infer<
  typeof GetUserTestAnswerLogListQuerySchema
>
