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

export const CreateUserAnswerLogBodySchema = UserAnswerLogSchema.pick({
  userExerciseAttemptId: true,
  questionBankId: true,
  answerId: true
}).strict()

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
    id: z.string().transform((val) => parseInt(val, 10))
  })
  .strict()

export const GetUserAnswerLogListQuerySchema = z
  .object({
    currentPage: z
      .string()
      .transform((val) => parseInt(val, 10))
      .optional()
      .default('1'),
    pageSize: z
      .string()
      .transform((val) => parseInt(val, 10))
      .optional()
      .default('10'),
    userExerciseAttemptId: z
      .string()
      .transform((val) => parseInt(val, 10))
      .optional(),
    questionBankId: z
      .string()
      .transform((val) => parseInt(val, 10))
      .optional(),
    isCorrect: z
      .string()
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
