import { createZodDto } from 'nestjs-zod'
import {
  CreateUserTestBodySchema,
  UpdateUserTestBodySchema,
  GetUserTestByIdParamsSchema,
  GetUserTestListQuerySchema,
  GetUserTestMyListQuerySchema,
  UserTestResSchema,
  UserTestListResSchema,
  UserTestMyListResSchema
} from '../entities/user-test.entity'

export class CreateUserTestBodyDTO extends createZodDto(CreateUserTestBodySchema) {}
export class UpdateUserTestBodyDTO extends createZodDto(UpdateUserTestBodySchema) {}
export class GetUserTestByIdParamsDTO extends createZodDto(GetUserTestByIdParamsSchema) {}
export class GetUserTestListQueryDTO extends createZodDto(GetUserTestListQuerySchema) {}
export class GetUserTestMyListQueryDTO extends createZodDto(
  GetUserTestMyListQuerySchema
) {}
export class UserTestResDTO extends createZodDto(UserTestResSchema) {}
export class UserTestListResDTO extends createZodDto(UserTestListResSchema) {}
export class UserTestMyListResDTO extends createZodDto(UserTestMyListResSchema) {}
