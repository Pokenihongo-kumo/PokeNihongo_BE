import { checkIdSchema } from '@/common/utils/id.validation'
import { UserPokemonMessage } from '@/i18n/message-keys'
import { PaginationQuerySchema } from '@/shared/models/request.model'
import { resSchema } from '@/shared/utils/res-schema'
import { z } from 'zod'
import {
  GetUserPokemonByPokemonIdwithListOwnershipSchema,
  UserPokemonSchema
} from '../entities/user-pokemon.entity'

// Create Schema

export const CreateUserPokemonBodySchema = z
  .object({
    pokemonId: z.number().min(1, UserPokemonMessage.INVALID_ID),
    nickname: z
      .string()
      .max(50, UserPokemonMessage.INVALID_NICKNAME)
      .nullable()
      .optional(),
    isMain: z.boolean().optional()
  })
  .strict()

export type CreateUserPokemonBody = z.infer<typeof CreateUserPokemonBodySchema>

export const CreateUserPokemonResSchema = resSchema(UserPokemonSchema)

// Update Schema

export const UpdateUserPokemonBodySchema = z
  .object({
    isEvolved: z.boolean().optional(),
    exp: z.number().min(0, UserPokemonMessage.INVALID_EXP).optional(),
    nickname: z
      .string()
      .max(50, UserPokemonMessage.INVALID_NICKNAME)
      .nullable()
      .optional(),
    isMain: z.boolean().optional()
  })
  .strict()

export type UpdateUserPokemonBody = z.infer<typeof UpdateUserPokemonBodySchema>

export const UpdateUserPokemonResSchema = CreateUserPokemonResSchema

// Query Schema

export const GetUserPokemonParamsSchema = z.object({
  userPokemonId: checkIdSchema(UserPokemonMessage.INVALID_ID)
})

export type GetUserPokemonParams = z.infer<typeof GetUserPokemonParamsSchema>

// The app's Pokemon list: hasPokemon true/false filters owned ones

export const GetUserPokemonListWithUserQuerySchema = PaginationQuerySchema.extend({
  hasPokemon: z
    .enum(['true', 'false'], {
      errorMap: () => ({ message: UserPokemonMessage.INVALID_HAS_POKEMON })
    })
    .transform((value) => value === 'true')
    .optional()
})

export const GetUserPokemonByPokemonIdParamsSchema = z.object({
  pokemonId: checkIdSchema(UserPokemonMessage.INVALID_POKEMON_ID)
})

export const GetUserPokemonDetailResSchema = resSchema(
  z.object({
    ...UserPokemonSchema.shape,
    user: z
      .object({
        id: z.number(),
        name: z.string(),
        email: z.string()
      })
      .optional(),
    pokemon: z
      .object({
        id: z.number(),
        pokedex_number: z.number(),
        nameJp: z.string(),
        nameTranslations: z.any(),
        description: z.string().nullable(),
        conditionLevel: z.number().nullable(),
        imageUrl: z.string().nullable(),
        rarity: z.string(),
        types: z
          .array(
            z.object({
              id: z.number(),
              type_name: z.string(),
              display_name: z.any(),
              color_hex: z.string()
            })
          )
          .optional(),
        weaknesses: z
          .array(
            z.object({
              id: z.number(),
              type_name: z.string(),
              display_name: z.any(),
              color_hex: z.string(),
              effectiveness_multiplier: z.number()
            })
          )
          .optional()
          .nullable(),
        nextPokemons: z
          .array(
            z.object({
              id: z.number(),
              pokedex_number: z.number(),
              nameJp: z.string(),
              nameTranslations: z.any(),
              description: z.string().nullable(),
              conditionLevel: z.number().nullable(),
              isStarted: z.boolean().nullable(),
              imageUrl: z.string().nullable(),
              rarity: z.string(),
              types: z
                .array(
                  z.object({
                    id: z.number(),
                    type_name: z.string(),
                    display_name: z.any(),
                    color_hex: z.string()
                  })
                )
                .optional(),
              weaknesses: z
                .array(
                  z.object({
                    id: z.number(),
                    type_name: z.string(),
                    display_name: z.any(),
                    color_hex: z.string(),
                    effectiveness_multiplier: z.number()
                  })
                )
                .optional()
                .nullable(),
              nextPokemons: z
                .array(
                  z.object({
                    id: z.number(),
                    pokedex_number: z.number(),
                    nameJp: z.string(),
                    nameTranslations: z.any(),
                    description: z.string().nullable(),
                    conditionLevel: z.number().nullable(),
                    isStarted: z.boolean().nullable(),
                    imageUrl: z.string().nullable(),
                    rarity: z.string(),
                    types: z
                      .array(
                        z.object({
                          id: z.number(),
                          type_name: z.string(),
                          display_name: z.any(),
                          color_hex: z.string()
                        })
                      )
                      .optional()
                      .nullable(),
                    weaknesses: z
                      .array(
                        z.object({
                          id: z.number(),
                          type_name: z.string(),
                          display_name: z.any(),
                          color_hex: z.string(),
                          effectiveness_multiplier: z.number()
                        })
                      )
                      .optional()
                      .nullable()
                  })
                )
                .optional()
                .nullable()
            })
          )
          .optional(),
        previousPokemons: z
          .array(
            z.object({
              id: z.number(),
              pokedex_number: z.number(),
              nameJp: z.string(),
              nameTranslations: z.any(),
              description: z.string().nullable(),
              conditionLevel: z.number().nullable(),
              isStarted: z.boolean().nullable(),
              imageUrl: z.string().nullable(),
              rarity: z.string(),
              types: z
                .array(
                  z.object({
                    id: z.number(),
                    type_name: z.string(),
                    display_name: z.any(),
                    color_hex: z.string()
                  })
                )
                .optional()
                .nullable(),
              weaknesses: z
                .array(
                  z.object({
                    id: z.number(),
                    type_name: z.string(),
                    display_name: z.any(),
                    color_hex: z.string(),
                    effectiveness_multiplier: z.number()
                  })
                )
                .optional()
                .nullable()
            })
          )
          .optional()
          .nullable()
      })
      .optional()
      .nullable()
  })
)

export type GetUserPokemonDetailRes = z.infer<typeof GetUserPokemonDetailResSchema>

export const GetUserPokemonStatsResSchema = resSchema(
  z.object({
    ownershipPercentage: z.number(),
    userPokemonsCount: z.number(),
    totalPokemons: z.number()
  })
)

export const GetUserPokemonAddExpDetailResSchema = resSchema(
  UserPokemonSchema.extend({
    user: z
      .object({
        id: z.number(),
        name: z.string(),
        email: z.string()
      })
      .optional(),
    pokemon: z
      .object({
        id: z.number(),
        pokedex_number: z.number(),
        nameJp: z.string(),
        nameTranslations: z.any(),
        description: z.string().nullable(),
        conditionLevel: z.number().nullable(),
        imageUrl: z.string().nullable(),
        rarity: z.string(),
        types: z
          .array(
            z.object({
              id: z.number(),
              type_name: z.string(),
              display_name: z.any(),
              color_hex: z.string()
            })
          )
          .optional()
      })
      .optional()
  })
)

// Add EXP Schema

export const AddExpBodySchema = z
  .object({
    expAmount: z.number().min(0, UserPokemonMessage.INVALID_EXP)
  })
  .strict()

export type AddExpBody = z.infer<typeof AddExpBodySchema>

// Evolution Schema

export const EvolvePokemonBodySchema = z
  .object({
    nextPokemonId: z.number().min(1, UserPokemonMessage.INVALID_ID)
  })
  .strict()

export type EvolvePokemonBody = z.infer<typeof EvolvePokemonBodySchema>

export const EvolvePokemonResSchema = resSchema(
  z.object({
    newUserPokemon: UserPokemonSchema,
    transferredExp: z.number(),
    message: z.string()
  })
)

export type EvolvePokemonRes = z.infer<typeof EvolvePokemonResSchema>

export const GetUserPokemonByPokemonIdwithListOwnershipResSchema = resSchema(
  GetUserPokemonByPokemonIdwithListOwnershipSchema
)
