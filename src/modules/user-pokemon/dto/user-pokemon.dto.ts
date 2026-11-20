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
export class CreateUserPokemonBodyDTO extends createZodDto(CreateUserPokemonBodySchema) {}
export class UpdateUserPokemonBodyDTO extends createZodDto(UpdateUserPokemonBodySchema) {}
export class GetUserPokemonParamsDTO extends createZodDto(GetUserPokemonParamsSchema) {}

// Response DTOs
export class CreateUserPokemonResDTO extends createZodDto(CreateUserPokemonResSchema) {}
export class UpdateUserPokemonResDTO extends createZodDto(UpdateUserPokemonResSchema) {}
export class GetUserPokemonDetailResDTO extends createZodDto(
  GetUserPokemonDetailResSchema
) {}

export class GetUserPokemonByPokemonIdParamsDTO extends createZodDto(
  GetUserPokemonByPokemonIdParamsSchema
) {}

export class GetUserPokemonStatsResDTO extends createZodDto(
  GetUserPokemonStatsResSchema
) {}

export class GetUserPokemonByPokemonIdwithListOwnershipResDTO extends createZodDto(
  GetUserPokemonByPokemonIdwithListOwnershipResSchema
) {}

export class GetUserPokemonListWithUserQueryDTO extends createZodDto(
  GetUserPokemonListWithUserQuerySchema
) {}
