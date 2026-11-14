import { createZodDto } from 'nestjs-zod'
import {
  AddExpBodySchema,
  CreateUserPokemonBodySchema,
  CreateUserPokemonResSchema,
  EvolvePokemonBodySchema,
  EvolvePokemonResSchema,
  GetUserPokemonAddExpDetailResSchema,
  GetUserPokemonByPokemonIdParamsSchema,
  GetUserPokemonListWithUserQuerySchema,
  GetUserPokemonByPokemonIdwithListOwnershipResSchema,
  GetUserPokemonDetailResSchema,
  GetUserPokemonParamsSchema,
  GetUserPokemonStatsResSchema,
  UpdateUserPokemonBodySchema,
  UpdateUserPokemonResSchema
} from '../entities/user-pokemon.entity'

// Request DTOs
export class CreateUserPokemonBodyDTO extends createZodDto(CreateUserPokemonBodySchema) {}
export class UpdateUserPokemonBodyDTO extends createZodDto(UpdateUserPokemonBodySchema) {}
export class GetUserPokemonParamsDTO extends createZodDto(GetUserPokemonParamsSchema) {}
export class AddExpBodyDTO extends createZodDto(AddExpBodySchema) {}
export class EvolvePokemonBodyDTO extends createZodDto(EvolvePokemonBodySchema) {}

// Response DTOs
export class CreateUserPokemonResDTO extends createZodDto(CreateUserPokemonResSchema) {}
export class UpdateUserPokemonResDTO extends createZodDto(UpdateUserPokemonResSchema) {}
export class GetUserPokemonDetailResDTO extends createZodDto(
  GetUserPokemonDetailResSchema
) {}
export class EvolvePokemonResDTO extends createZodDto(EvolvePokemonResSchema) {}

export class GetUserPokemonAddExpDetailResDTO extends createZodDto(
  GetUserPokemonAddExpDetailResSchema
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
