import { createZodDto } from 'nestjs-zod'
import {
  CreateUserTestBodySchema,
  UpdateUserTestBodySchema,
  GetUserTestByIdParamsSchema,
  GetUserTestListQuerySchema,
  UserTestResSchema,
  UserTestListResSchema,
  UserTestMyListResSchema
} from '../entities/user-test.entities'

export class CreateUserTestBodyDTO extends createZodDto(CreateUserTestBodySchema) {}
export class UpdateUserTestBodyDTO extends createZodDto(UpdateUserTestBodySchema) {}
export class GetUserTestByIdParamsDTO extends createZodDto(GetUserTestByIdParamsSchema) {}
export class GetUserTestListQueryDTO extends createZodDto(GetUserTestListQuerySchema) {}
export class UserTestResDTO extends createZodDto(UserTestResSchema) {}
export class UserTestListResDTO extends createZodDto(UserTestListResSchema) {}
export class UserTestMyListResDTO extends createZodDto(UserTestMyListResSchema) {}
