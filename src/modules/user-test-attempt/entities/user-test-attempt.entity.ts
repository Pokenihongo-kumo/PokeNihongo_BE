import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'
import { TestAttemptStatus } from '@prisma/client'
import { UserTestAttemptMessage as M } from '@/i18n/message-keys'
import { checkIdSchema } from '@/common/utils/id.validation'

extendZodWithOpenApi(z)
patchNestJsSwagger()

// TestAttemptStatus enum
export const TestAttemptStatusSchema = z.nativeEnum(TestAttemptStatus)
const statusOf = z.nativeEnum(TestAttemptStatus, {
  errorMap: () => ({ message: M.INVALID_STATUS })
})

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

export const UpdateUserTestAttemptBodySchema = z
  .object({ status: statusOf.optional() })
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
  .object({ id: checkIdSchema(M.INVALID_ID) })
  .strict()

export const CreateUserTestAttemptParamsSchema = z
  .object({ testId: checkIdSchema(M.INVALID_TEST_ID) })
  .strict()

// GET /test/:id takes a test id
export const UserTestAttemptTestParamsSchema = z
  .object({ id: checkIdSchema(M.INVALID_TEST_ID) })
  .strict()

export const GetUserTestAttemptListQuerySchema = z
  .object({
    currentPage: checkIdSchema(M.INVALID_PAGE).default(1),
    pageSize: checkIdSchema(M.INVALID_PAGE_SIZE).default(10),
    userId: checkIdSchema(M.INVALID_USER_ID).optional(),
    testId: checkIdSchema(M.INVALID_TEST_ID).optional(),
    status: statusOf.optional()
  })
  .strict()

// Submit / abandon body: time spent in seconds, optional. The app sends no
// body to abandon, so a missing body is {}
export const CheckTestCompletionBodySchema = z
  .object({
    time: z
      .number({ invalid_type_error: M.INVALID_TIME })
      .int(M.INVALID_TIME)
      .nonnegative(M.INVALID_TIME)
      .optional()
  })
  .strict()
  .default({})

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
