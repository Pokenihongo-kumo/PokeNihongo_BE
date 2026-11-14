import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'
import { UserTestStatus, TestStatus } from '@prisma/client'

extendZodWithOpenApi(z)
patchNestJsSwagger()

// UserTestStatus enum schema
export const UserTestStatusSchema = z.nativeEnum(UserTestStatus)

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
    userId: z.number(),
    testId: z.number(),
    status: UserTestStatusSchema.optional().default(UserTestStatus.NOT_STARTED),
    limit: z.number().int().min(0).nullable().optional()
  })
  .strict()

// Update UserTest schema
export const UpdateUserTestBodySchema = z
  .object({
    status: UserTestStatusSchema.optional(),
    limit: z.number().int().min(0).nullable().optional()
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
  .object({
    id: z.string().transform((val) => parseInt(val, 10))
  })
  .strict()

const OrderSchema = z.enum(['asc', 'desc'])

export const GetUserTestListQuerySchema = z
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
    status: UserTestStatusSchema.optional(),
    testType: z.nativeEnum(TestStatus).optional(),
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
