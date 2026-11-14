import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'
import { UserTestStatus, TestStatus } from '@prisma/client'
import { UserTestMessage as M } from '@/i18n/message-keys'
import { checkIdSchema } from '@/common/utils/id.validation'

extendZodWithOpenApi(z)
patchNestJsSwagger()

// UserTestStatus enum schema
export const UserTestStatusSchema = z.nativeEnum(UserTestStatus)

const statusOf = z.nativeEnum(UserTestStatus, {
  errorMap: () => ({ message: M.INVALID_STATUS })
})
const idOf = (key: string) =>
  z.number({ invalid_type_error: key, required_error: key }).int(key).positive(key)
const limitSchema = z
  .number({ invalid_type_error: M.INVALID_LIMIT })
  .int(M.INVALID_LIMIT)
  .min(0, M.INVALID_LIMIT)
  .nullable()
  .optional()

// TestInfo schema (simplified Test without timestamps, creatorId)
export const TestInfoSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable().optional(),
  price: z.number().nullable().optional(),
  levelN: z.number().int().min(0).max(5).nullable().optional(),
  testType: z.string(),
  status: z.string(),
  limit: z.number().int().min(0).nullable().optional()
})

// UserTest schema
export const UserTestSchema = z.object({
  id: z.number(),
  userId: z.number(),
  testId: z.number(),
  status: UserTestStatusSchema,
  limit: z.number().int().min(0).nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date()
})

// UserTestWithTest schema (for my endpoint response)
export const UserTestWithTestSchema = z.object({
  id: z.number(),
  userId: z.number(),
  status: UserTestStatusSchema,
  limit: z.number().int().min(0).nullable().optional(),
  test: TestInfoSchema
})

// Create UserTest schema
export const CreateUserTestBodySchema = z
  .object({
    userId: idOf(M.INVALID_USER_ID),
    testId: idOf(M.INVALID_TEST_ID),
    status: statusOf.optional().default(UserTestStatus.NOT_STARTED),
    limit: limitSchema
  })
  .strict()

// Update UserTest schema
export const UpdateUserTestBodySchema = z
  .object({
    status: statusOf.optional(),
    limit: limitSchema
  })
  .strict()

// Response schemas
export const UserTestResSchema = z
  .object({
    data: UserTestSchema,
    message: z.string()
  })
  .strict()

export const UserTestListResSchema = z
  .object({
    statusCode: z.number(),
    data: z.object({
      results: z.array(UserTestSchema),
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

// Response schema for my endpoint (with Test info)
export const UserTestMyListResSchema = z
  .object({
    statusCode: z.number(),
    data: z.object({
      results: z.array(UserTestWithTestSchema),
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

// Params and Query schemas
export const GetUserTestByIdParamsSchema = z
  .object({ id: checkIdSchema(M.INVALID_ID) })
  .strict()

const OrderSchema = z.enum(['asc', 'desc'], {
  errorMap: () => ({ message: M.INVALID_ORDER })
})
const testTypeOf = z.nativeEnum(TestStatus, {
  errorMap: () => ({ message: M.INVALID_TEST_TYPE })
})

export const GetUserTestListQuerySchema = z
  .object({
    currentPage: checkIdSchema(M.INVALID_PAGE).default(1),
    pageSize: checkIdSchema(M.INVALID_PAGE_SIZE).default(10),
    userId: checkIdSchema(M.INVALID_USER_ID).optional(),
    testId: checkIdSchema(M.INVALID_TEST_ID).optional(),
    status: statusOf.optional(),
    testType: testTypeOf.optional(),
    order: OrderSchema.optional().default('asc')
  })
  .strict()

// The app's own tests: type is the test type, the user comes from the token
export const GetUserTestMyListQuerySchema = z
  .object({
    currentPage: checkIdSchema(M.INVALID_PAGE).default(1),
    pageSize: checkIdSchema(M.INVALID_PAGE_SIZE).default(10),
    testId: checkIdSchema(M.INVALID_TEST_ID).optional(),
    status: statusOf.optional(),
    type: testTypeOf.optional(),
    order: OrderSchema.optional().default('asc')
  })
  .strict()

// Types
export type UserTestType = z.infer<typeof UserTestSchema>
export type TestInfoType = z.infer<typeof TestInfoSchema>
export type UserTestWithTestType = z.infer<typeof UserTestWithTestSchema>
export type CreateUserTestBodyType = z.infer<typeof CreateUserTestBodySchema>
export type UpdateUserTestBodyType = z.infer<typeof UpdateUserTestBodySchema>
export type UserTestResType = z.infer<typeof UserTestResSchema>
export type UserTestListResType = z.infer<typeof UserTestListResSchema>
export type UserTestMyListResType = z.infer<typeof UserTestMyListResSchema>
export type GetUserTestByIdParamsType = z.infer<typeof GetUserTestByIdParamsSchema>
export type GetUserTestListQueryType = z.infer<typeof GetUserTestListQuerySchema>
export type GetUserTestMyListQueryType = z.infer<typeof GetUserTestMyListQuerySchema>
