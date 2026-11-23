import { z } from 'zod'
import { createZodDto } from 'nestjs-zod'
import {
  CreateUserPokemonBodySchema,
  CreateUserPokemonResSchema,
  GetUserPokemonByPokemonIdParamsSchema,
  GetUserPokemonByPokemonIdwithListOwnershipResSchema,
  GetUserPokemonDetailResSchema,
  GetUserPokemonListWithUserQuerySchema,
  GetUserPokemonParamsSchema,
  GetUserPokemonStatsResSchema,
  UpdateUserPokemonBodySchema,
  UpdateUserPokemonResSchema
} from './user-pokemon.zod-dto'

// Request DTOs

export type CreateUserPokemonBody = z.infer<typeof CreateUserPokemonBodySchema>

export class CreateUserPokemonBodyDTO extends createZodDto(CreateUserPokemonBodySchema) {}

export type UpdateUserPokemonBody = z.infer<typeof UpdateUserPokemonBodySchema>

export class UpdateUserPokemonBodyDTO extends createZodDto(UpdateUserPokemonBodySchema) {}

export type GetUserPokemonParams = z.infer<typeof GetUserPokemonParamsSchema>

export class GetUserPokemonParamsDTO extends createZodDto(GetUserPokemonParamsSchema) {}

// Response DTOs

export type CreateUserPokemonRes = z.infer<typeof CreateUserPokemonResSchema>

export class CreateUserPokemonResDTO extends createZodDto(CreateUserPokemonResSchema) {}

export type UpdateUserPokemonRes = z.infer<typeof UpdateUserPokemonResSchema>

export class UpdateUserPokemonResDTO extends createZodDto(UpdateUserPokemonResSchema) {}

export type GetUserPokemonDetailRes = z.infer<typeof GetUserPokemonDetailResSchema>

export class GetUserPokemonDetailResDTO extends createZodDto(
  GetUserPokemonDetailResSchema
) {}

export type GetUserPokemonByPokemonIdParams = z.infer<
  typeof GetUserPokemonByPokemonIdParamsSchema
>

export class GetUserPokemonByPokemonIdParamsDTO extends createZodDto(
  GetUserPokemonByPokemonIdParamsSchema
) {}

export type GetUserPokemonStatsRes = z.infer<typeof GetUserPokemonStatsResSchema>

export class GetUserPokemonStatsResDTO extends createZodDto(
  GetUserPokemonStatsResSchema
) {}

export type GetUserPokemonByPokemonIdwithListOwnershipRes = z.infer<
  typeof GetUserPokemonByPokemonIdwithListOwnershipResSchema
>

export class GetUserPokemonByPokemonIdwithListOwnershipResDTO extends createZodDto(
  GetUserPokemonByPokemonIdwithListOwnershipResSchema
) {}

export type GetUserPokemonListWithUserQuery = z.infer<
  typeof GetUserPokemonListWithUserQuerySchema
>

export class GetUserPokemonListWithUserQueryDTO extends createZodDto(
  GetUserPokemonListWithUserQuerySchema
) {}
