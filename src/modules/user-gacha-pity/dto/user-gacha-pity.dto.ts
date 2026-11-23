import { z } from 'zod'
import { createZodDto } from 'nestjs-zod'
import {
  CreateUserGachaPityBodySchema,
  CreateUserGachaPityResSchema,
  GetUserGachaPityDetailResSchema,
  GetUserGachaPityParamsSchema,
  UpdateUserGachaPityBodySchema,
  UpdateUserGachaPityResSchema
} from './user-gacha-pity.zod-dto'

// Request DTOs

export type CreateUserGachaPityBody = z.infer<typeof CreateUserGachaPityBodySchema>

export class CreateUserGachaPityBodyDTO extends createZodDto(
  CreateUserGachaPityBodySchema
) {}

export type UpdateUserGachaPityBody = z.infer<typeof UpdateUserGachaPityBodySchema>

export class UpdateUserGachaPityBodyDTO extends createZodDto(
  UpdateUserGachaPityBodySchema
) {}

export type GetUserGachaPityParams = z.infer<typeof GetUserGachaPityParamsSchema>

export class GetUserGachaPityParamsDTO extends createZodDto(
  GetUserGachaPityParamsSchema
) {}

// Response DTOs

export type CreateUserGachaPityRes = z.infer<typeof CreateUserGachaPityResSchema>

export class CreateUserGachaPityResDTO extends createZodDto(
  CreateUserGachaPityResSchema
) {}

export type UpdateUserGachaPityRes = z.infer<typeof UpdateUserGachaPityResSchema>

export class UpdateUserGachaPityResDTO extends createZodDto(
  UpdateUserGachaPityResSchema
) {}

export type GetUserGachaPityDetailRes = z.infer<typeof GetUserGachaPityDetailResSchema>

export class GetUserGachaPityDetailResDTO extends createZodDto(
  GetUserGachaPityDetailResSchema
) {}
