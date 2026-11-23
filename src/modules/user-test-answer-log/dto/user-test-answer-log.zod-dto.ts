import { checkIdSchema } from '@/common/utils/id.validation'
import { UserTestAnswerLogMessage as M } from '@/i18n/message-keys'
import { paginatedResSchema } from '@/shared/utils/pagination'
import { resSchema } from '@/shared/utils/res-schema'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import { UserTestAnswerLogSchema } from '../entities/user-test-answer-log.entity'

const idOf = (key: string) =>
  z.number({ invalid_type_error: key, required_error: key }).int(key).positive(key)

export const CreateUserTestAnswerLogBodySchema = z
  .object({
    userTestAttemptId: idOf(M.INVALID_ATTEMPT_ID),
    questionBankId: idOf(M.INVALID_QUESTION_ID),
    answerId: idOf(M.INVALID_ANSWER_ID)
  })
  .strict()

export type CreateUserTestAnswerLogBody = z.infer<
  typeof CreateUserTestAnswerLogBodySchema
>

export class CreateUserTestAnswerLogBodyDTO extends createZodDto(
  CreateUserTestAnswerLogBodySchema
) {}

export const UpdateUserTestAnswerLogBodySchema = UserTestAnswerLogSchema.pick({
  isCorrect: true
})
  .partial()
  .strict()

export type UpdateUserTestAnswerLogBody = z.infer<
  typeof UpdateUserTestAnswerLogBodySchema
>

export class UpdateUserTestAnswerLogBodyDTO extends createZodDto(
  UpdateUserTestAnswerLogBodySchema
) {}

export const UserTestAnswerLogResSchema = resSchema(UserTestAnswerLogSchema).strict()

export type UserTestAnswerLogRes = z.infer<typeof UserTestAnswerLogResSchema>

export class UserTestAnswerLogResDTO extends createZodDto(UserTestAnswerLogResSchema) {}

export const UserTestAnswerLogListResSchema = paginatedResSchema(
  UserTestAnswerLogSchema
).strict()

export type UserTestAnswerLogListRes = z.infer<typeof UserTestAnswerLogListResSchema>

export class UserTestAnswerLogListResDTO extends createZodDto(
  UserTestAnswerLogListResSchema
) {}

export const GetUserTestAnswerLogByIdParamsSchema = z
  .object({
    id: checkIdSchema(M.INVALID_ID)
  })
  .strict()

export type GetUserTestAnswerLogByIdParams = z.infer<
  typeof GetUserTestAnswerLogByIdParamsSchema
>

export class GetUserTestAnswerLogByIdParamsDTO extends createZodDto(
  GetUserTestAnswerLogByIdParamsSchema
) {}

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

export type GetUserTestAnswerLogListQuery = z.infer<
  typeof GetUserTestAnswerLogListQuerySchema
>

export class GetUserTestAnswerLogListQueryDTO extends createZodDto(
  GetUserTestAnswerLogListQuerySchema
) {}
