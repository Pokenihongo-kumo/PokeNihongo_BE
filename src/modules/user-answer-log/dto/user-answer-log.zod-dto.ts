import { createZodDto } from 'nestjs-zod'
import {
  CreateUserAnswerLogBodySchema,
  UpdateUserAnswerLogBodySchema,
  GetUserAnswerLogByIdParamsSchema,
  GetUserAnswerLogListQuerySchema,
  UserAnswerLogResSchema,
  UserAnswerLogListResSchema
} from '../entities/user-answer-log.entities'

export class CreateUserAnswerLogBodyDTO extends createZodDto(
  CreateUserAnswerLogBodySchema
) {}
export class UpdateUserAnswerLogBodyDTO extends createZodDto(
  UpdateUserAnswerLogBodySchema
) {}
export class GetUserAnswerLogByIdParamsDTO extends createZodDto(
  GetUserAnswerLogByIdParamsSchema
) {}
export class GetUserAnswerLogListQueryDTO extends createZodDto(
  GetUserAnswerLogListQuerySchema
) {}
export class UserAnswerLogResDTO extends createZodDto(UserAnswerLogResSchema) {}
export class UserAnswerLogListResDTO extends createZodDto(UserAnswerLogListResSchema) {}
