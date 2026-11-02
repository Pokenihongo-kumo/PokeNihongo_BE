import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'

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

export const CreateUserTestAnswerLogBodySchema = UserTestAnswerLogSchema.pick({
  userTestAttemptId: true,
  questionBankId: true,
  answerId: true
}).strict()

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
    id: z.string().transform((val) => parseInt(val, 10))
  })
  .strict()

export const GetUserTestAnswerLogListQuerySchema = z
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
    userTestAttemptId: z
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
