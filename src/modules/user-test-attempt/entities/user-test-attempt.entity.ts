import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'
import { TestAttemptStatus } from '@prisma/client'

extendZodWithOpenApi(z)
patchNestJsSwagger()

// TestAttemptStatus enum
export const TestAttemptStatusSchema = z.nativeEnum(TestAttemptStatus)

// UserTestAttempt schema
export const UserTestAttemptSchema = z.object({
  id: z.number(),
  userId: z.number(),
  testId: z.number(),
  status: TestAttemptStatusSchema,
  time: z.number().optional().nullable(),
  score: z.number().optional().nullable(),
  createdAt: z.date(),
  updatedAt: z.date()
})

export const CreateUserTestAttemptBodySchema = z.object({}).strict()

export const UpdateUserTestAttemptBodySchema = UserTestAttemptSchema.pick({
  status: true
})
  .partial()
  .strict()

export const UserTestAttemptResSchema = z
  .object({
    statusCode: z.number(),
    data: UserTestAttemptSchema,
    message: z.string()
  })
  .strict()

export const UserTestAttemptListResSchema = z
  .object({
    statusCode: z.number(),
    data: z.object({
      results: z.array(UserTestAttemptSchema),
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

export const GetUserTestAttemptByIdParamsSchema = z
  .object({
    id: z.string().transform((val) => parseInt(val, 10))
  })
  .strict()

export const CreateUserTestAttemptParamsSchema = z
  .object({
    testId: z.string().transform((val) => parseInt(val, 10))
  })
  .strict()

export const GetUserTestAttemptListQuerySchema = z
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
    userId: z
      .string()
      .transform((val) => parseInt(val, 10))
      .optional(),
    testId: z
      .string()
      .transform((val) => parseInt(val, 10))
      .optional(),
    status: TestAttemptStatusSchema.optional()
  })
  .strict()

// Check completion body (time in seconds, optional)
export const CheckTestCompletionBodySchema = z
  .object({
    time: z.number().int().nonnegative().optional()
  })
  .strict()

// Types
export type TestAttemptStatusType = z.infer<typeof TestAttemptStatusSchema>
export type UserTestAttemptType = z.infer<typeof UserTestAttemptSchema>
export type CreateUserTestAttemptBodyType = z.infer<
  typeof CreateUserTestAttemptBodySchema
>
export type UpdateUserTestAttemptBodyType = z.infer<
  typeof UpdateUserTestAttemptBodySchema
>
export type UserTestAttemptResType = z.infer<typeof UserTestAttemptResSchema>
export type UserTestAttemptListResType = z.infer<typeof UserTestAttemptListResSchema>
export type GetUserTestAttemptByIdParamsType = z.infer<
  typeof GetUserTestAttemptByIdParamsSchema
>
export type CreateUserTestAttemptParamsType = z.infer<
  typeof CreateUserTestAttemptParamsSchema
>
export type GetUserTestAttemptListQueryType = z.infer<
  typeof GetUserTestAttemptListQuerySchema
>
export type CheckTestCompletionBodyType = z.infer<typeof CheckTestCompletionBodySchema>
