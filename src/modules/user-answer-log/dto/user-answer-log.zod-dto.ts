import { checkIdSchema } from '@/common/utils/id.validation'
import { UserAnswerLogMessage as M } from '@/i18n/message-keys'
import { paginatedResSchema } from '@/shared/utils/pagination'
import { resSchema } from '@/shared/utils/res-schema'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import { UserAnswerLogSchema } from '../entities/user-answer-log.entity'

const idOf = (key: string) =>
  z.number({ invalid_type_error: key, required_error: key }).int(key).positive(key)

export const CreateUserAnswerLogBodySchema = z
  .object({
    userExerciseAttemptId: idOf(M.INVALID_ATTEMPT_ID),
    questionBankId: idOf(M.INVALID_QUESTION_ID),
    answerId: idOf(M.INVALID_ANSWER_ID)
  })
  .strict()

export type CreateUserAnswerLogBody = z.infer<typeof CreateUserAnswerLogBodySchema>

export class CreateUserAnswerLogBodyDTO extends createZodDto(
  CreateUserAnswerLogBodySchema
) {}

export const UpdateUserAnswerLogBodySchema = UserAnswerLogSchema.pick({
  isCorrect: true
})
  .partial()
  .strict()

export type UpdateUserAnswerLogBody = z.infer<typeof UpdateUserAnswerLogBodySchema>

export class UpdateUserAnswerLogBodyDTO extends createZodDto(
  UpdateUserAnswerLogBodySchema
) {}

export const UserAnswerLogResSchema = resSchema(UserAnswerLogSchema).strict()

export class UserAnswerLogResDTO extends createZodDto(UserAnswerLogResSchema) {}

export const UserAnswerLogListResSchema = paginatedResSchema(UserAnswerLogSchema).strict()

export class UserAnswerLogListResDTO extends createZodDto(UserAnswerLogListResSchema) {}

export const GetUserAnswerLogByIdParamsSchema = z
  .object({
    id: checkIdSchema(M.INVALID_ID)
  })
  .strict()

export class GetUserAnswerLogByIdParamsDTO extends createZodDto(
  GetUserAnswerLogByIdParamsSchema
) {}

export const GetUserAnswerLogListQuerySchema = z
  .object({
    currentPage: checkIdSchema(M.INVALID_PAGE).default(1),
    pageSize: checkIdSchema(M.INVALID_PAGE_SIZE).default(10),
    userExerciseAttemptId: checkIdSchema(M.INVALID_ATTEMPT_ID).optional(),
    questionBankId: checkIdSchema(M.INVALID_QUESTION_ID).optional(),
    isCorrect: z
      .enum(['true', 'false'], { errorMap: () => ({ message: M.INVALID_FLAG }) })
      .transform((val) => val === 'true')
      .optional()
  })
  .strict()

export type GetUserAnswerLogListQuery = z.infer<typeof GetUserAnswerLogListQuerySchema>

export class GetUserAnswerLogListQueryDTO extends createZodDto(
  GetUserAnswerLogListQuerySchema
) {}
