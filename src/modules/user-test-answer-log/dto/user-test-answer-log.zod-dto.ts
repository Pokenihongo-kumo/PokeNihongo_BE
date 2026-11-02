import { createZodDto } from 'nestjs-zod'
import {
  CreateUserTestAnswerLogBodySchema,
  UpdateUserTestAnswerLogBodySchema,
  GetUserTestAnswerLogByIdParamsSchema,
  GetUserTestAnswerLogListQuerySchema,
  UserTestAnswerLogResSchema,
  UserTestAnswerLogListResSchema
} from '../entities/user-test-answer-log.entities'

export class CreateUserTestAnswerLogBodyDTO extends createZodDto(
  CreateUserTestAnswerLogBodySchema
) {}
export class UpdateUserTestAnswerLogBodyDTO extends createZodDto(
  UpdateUserTestAnswerLogBodySchema
) {}
export class GetUserTestAnswerLogByIdParamsDTO extends createZodDto(
  GetUserTestAnswerLogByIdParamsSchema
) {}
export class GetUserTestAnswerLogListQueryDTO extends createZodDto(
  GetUserTestAnswerLogListQuerySchema
) {}
export class UserTestAnswerLogResDTO extends createZodDto(UserTestAnswerLogResSchema) {}
export class UserTestAnswerLogListResDTO extends createZodDto(
  UserTestAnswerLogListResSchema
) {}
