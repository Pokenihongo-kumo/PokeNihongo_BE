import { createZodDto } from 'nestjs-zod'
import {
  CreateUserGachaPityBodySchema,
  CreateUserGachaPityResSchema,
  GetUserGachaPityDetailResSchema,
  GetUserGachaPityParamsSchema,
  UpdateUserGachaPityBodySchema,
  UpdateUserGachaPityResSchema,
  UpdateWithListItemResSchema
} from './user-gacha-pity.zod-dto'

// Request DTOs
export class CreateUserGachaPityBodyDTO extends createZodDto(
  CreateUserGachaPityBodySchema
) {}

export class UpdateUserGachaPityBodyDTO extends createZodDto(
  UpdateUserGachaPityBodySchema
) {}

export class GetUserGachaPityParamsDTO extends createZodDto(
  GetUserGachaPityParamsSchema
) {}

// Response DTOs
export class CreateUserGachaPityResDTO extends createZodDto(
  CreateUserGachaPityResSchema
) {}
export class UpdateUserGachaPityResDTO extends createZodDto(
  UpdateUserGachaPityResSchema
) {}
export class UpdateWithListItemResDTO extends createZodDto(UpdateWithListItemResSchema) {}
export class GetUserGachaPityDetailResDTO extends createZodDto(
  GetUserGachaPityDetailResSchema
) {}
