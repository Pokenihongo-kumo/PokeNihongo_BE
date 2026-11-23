import { checkIdSchema } from '@/common/utils/id.validation'
import { UserTestAttemptMessage as M } from '@/i18n/message-keys'
import { paginatedResSchema } from '@/shared/utils/pagination'
import { resSchema } from '@/shared/utils/res-schema'
import { TestAttemptStatus as PrismaTestAttemptStatus } from '@prisma/client'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import { UserTestAttemptSchema } from '../entities/user-test-attempt.entity'

export const statusOf = z.nativeEnum(PrismaTestAttemptStatus, {
  errorMap: () => ({ message: M.INVALID_STATUS })
})

export const CreateUserTestAttemptBodySchema = z.object({}).strict()

export type CreateUserTestAttemptBody = z.infer<typeof CreateUserTestAttemptBodySchema>

export class CreateUserTestAttemptBodyDTO extends createZodDto(
  CreateUserTestAttemptBodySchema
) {}

export const UpdateUserTestAttemptBodySchema = z
  .object({ status: statusOf.optional() })
  .strict()

export type UpdateUserTestAttemptBody = z.infer<typeof UpdateUserTestAttemptBodySchema>

export class UpdateUserTestAttemptBodyDTO extends createZodDto(
  UpdateUserTestAttemptBodySchema
) {}

export const UserTestAttemptResSchema = resSchema(UserTestAttemptSchema).strict()

export type UserTestAttemptRes = z.infer<typeof UserTestAttemptResSchema>

export class UserTestAttemptResDTO extends createZodDto(UserTestAttemptResSchema) {}

export const UserTestAttemptListResSchema =
  paginatedResSchema(UserTestAttemptSchema).strict()

export type UserTestAttemptListRes = z.infer<typeof UserTestAttemptListResSchema>

export class UserTestAttemptListResDTO extends createZodDto(
  UserTestAttemptListResSchema
) {}

export const GetUserTestAttemptByIdParamsSchema = z
  .object({ id: checkIdSchema(M.INVALID_ID) })
  .strict()

export type GetUserTestAttemptByIdParams = z.infer<
  typeof GetUserTestAttemptByIdParamsSchema
>

export class GetUserTestAttemptByIdParamsDTO extends createZodDto(
  GetUserTestAttemptByIdParamsSchema
) {}

export const CreateUserTestAttemptParamsSchema = z
  .object({ testId: checkIdSchema(M.INVALID_TEST_ID) })
  .strict()

export type CreateUserTestAttemptParams = z.infer<
  typeof CreateUserTestAttemptParamsSchema
>

export class CreateUserTestAttemptParamsDTO extends createZodDto(
  CreateUserTestAttemptParamsSchema
) {}

// GET /test/:id takes a test id

export const UserTestAttemptTestParamsSchema = z
  .object({ id: checkIdSchema(M.INVALID_TEST_ID) })
  .strict()

export type UserTestAttemptTestParams = z.infer<typeof UserTestAttemptTestParamsSchema>

export class UserTestAttemptTestParamsDTO extends createZodDto(
  UserTestAttemptTestParamsSchema
) {}

export const GetUserTestAttemptListQuerySchema = z
  .object({
    currentPage: checkIdSchema(M.INVALID_PAGE).default(1),
    pageSize: checkIdSchema(M.INVALID_PAGE_SIZE).default(10),
    userId: checkIdSchema(M.INVALID_USER_ID).optional(),
    testId: checkIdSchema(M.INVALID_TEST_ID).optional(),
    status: statusOf.optional()
  })
  .strict()

export type GetUserTestAttemptListQuery = z.infer<
  typeof GetUserTestAttemptListQuerySchema
>

export class GetUserTestAttemptListQueryDTO extends createZodDto(
  GetUserTestAttemptListQuerySchema
) {}

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

export type CheckTestCompletionBody = z.infer<typeof CheckTestCompletionBodySchema>

export class CheckTestCompletionBodyDTO extends createZodDto(
  CheckTestCompletionBodySchema
) {}
