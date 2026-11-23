import { checkIdSchema } from '@/common/utils/id.validation'
import { UserTestMessage as M } from '@/i18n/message-keys'
import { paginatedResSchema } from '@/shared/utils/pagination'
import { TestStatus, UserTestStatus } from '@prisma/client'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import { UserTestSchema, UserTestWithTestSchema } from '../entities/user-test.entity'

export const statusOf = z.nativeEnum(UserTestStatus, {
  errorMap: () => ({ message: M.INVALID_STATUS })
})

export const idOf = (key: string) =>
  z.number({ invalid_type_error: key, required_error: key }).int(key).positive(key)

export const limitSchema = z
  .number({ invalid_type_error: M.INVALID_LIMIT })
  .int(M.INVALID_LIMIT)
  .min(0, M.INVALID_LIMIT)
  .nullable()
  .optional()

// Create UserTest schema

export const CreateUserTestBodySchema = z
  .object({
    userId: idOf(M.INVALID_USER_ID),
    testId: idOf(M.INVALID_TEST_ID),
    status: statusOf.optional().default(UserTestStatus.NOT_STARTED),
    limit: limitSchema
  })
  .strict()

export type CreateUserTestBody = z.infer<typeof CreateUserTestBodySchema>

export class CreateUserTestBodyDTO extends createZodDto(CreateUserTestBodySchema) {}

// Update UserTest schema

export const UpdateUserTestBodySchema = z
  .object({
    status: statusOf.optional(),
    limit: limitSchema
  })
  .strict()

export type UpdateUserTestBody = z.infer<typeof UpdateUserTestBodySchema>

export class UpdateUserTestBodyDTO extends createZodDto(UpdateUserTestBodySchema) {}

// Response schemas

export const UserTestResSchema = z
  .object({
    data: UserTestSchema,
    message: z.string()
  })
  .strict()

export type UserTestRes = z.infer<typeof UserTestResSchema>

export class UserTestResDTO extends createZodDto(UserTestResSchema) {}

export const UserTestListResSchema = paginatedResSchema(UserTestSchema).strict()

export type UserTestListRes = z.infer<typeof UserTestListResSchema>

export class UserTestListResDTO extends createZodDto(UserTestListResSchema) {}

// Response schema for my endpoint (with Test info)

export const UserTestMyListResSchema = paginatedResSchema(UserTestWithTestSchema).strict()

export type UserTestMyListRes = z.infer<typeof UserTestMyListResSchema>

export class UserTestMyListResDTO extends createZodDto(UserTestMyListResSchema) {}

// Params and Query schemas

export const GetUserTestByIdParamsSchema = z
  .object({ id: checkIdSchema(M.INVALID_ID) })
  .strict()

export type GetUserTestByIdParams = z.infer<typeof GetUserTestByIdParamsSchema>

export class GetUserTestByIdParamsDTO extends createZodDto(GetUserTestByIdParamsSchema) {}

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

export type GetUserTestListQuery = z.infer<typeof GetUserTestListQuerySchema>

export class GetUserTestListQueryDTO extends createZodDto(GetUserTestListQuerySchema) {}

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

export type GetUserTestMyListQuery = z.infer<typeof GetUserTestMyListQuerySchema>

export class GetUserTestMyListQueryDTO extends createZodDto(
  GetUserTestMyListQuerySchema
) {}
