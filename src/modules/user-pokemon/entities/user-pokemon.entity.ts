import { checkIdSchema } from '@/common/utils/id.validation'
import { UserPokemonMessage } from '@/i18n/message-keys'
import { PokemonSchema } from '@/modules/pokemon/entities/pokemon.entity'
import { PaginationQuerySchema } from '@/shared/models/request.model'
import { resSchema } from '@/shared/utils/res-schema'
import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'

extendZodWithOpenApi(z)
patchNestJsSwagger()

// Base UserPokemon Schema
export const UserPokemonSchema = z.object({
  id: z.number(),
  userId: z.number(),
  pokemonId: z.number(),
  nickname: z.string().max(50, UserPokemonMessage.INVALID_NICKNAME).nullable(),
  exp: z.number().min(0, UserPokemonMessage.INVALID_EXP).default(0),
  isEvolved: z.boolean().default(false),
  isMain: z.boolean().default(false),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable()
})

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

export const UpdateUserPokemonResSchema = CreateUserPokemonResSchema

// Query Schema
export const GetUserPokemonParamsSchema = z.object({
  userPokemonId: checkIdSchema(UserPokemonMessage.INVALID_ID)
})

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

// Evolution Schema
export const EvolvePokemonBodySchema = z
  .object({
    nextPokemonId: z.number().min(1, UserPokemonMessage.INVALID_ID)
  })
  .strict()

export const EvolvePokemonResSchema = resSchema(
  z.object({
    newUserPokemon: UserPokemonSchema,
    transferredExp: z.number(),
    message: z.string()
  })
)

const DisplayNameSchema = z.object({
  en: z.string(),
  ja: z.string(),
  vi: z.string()
})

const TypeSchema = z.object({
  id: z.number(),
  type_name: z.string(),
  display_name: DisplayNameSchema,
  color_hex: z.string()
})

const WeaknessSchema = z.object({
  id: z.number(),
  type_name: z.string(),
  display_name: DisplayNameSchema,
  color_hex: z.string(),
  effectiveness_multiplier: z.number()
})

// Recursive schema cho nextPokemons
const NextPokemonSchema: z.ZodType<any> = z.lazy(() =>
  PokemonSchema.pick({
    id: true,
    pokedex_number: true,
    nameJp: true,
    nameTranslations: true,
    imageUrl: true,
    rarity: true,
    conditionLevel: true
  }).extend({
    userPokemon: z.boolean().default(false),
    nextPokemons: z.array(NextPokemonSchema).optional(),
    weaknesses: z.array(WeaknessSchema).optional()
  })
)

export const PrevPokemonSchema = z.object({
  id: z.number(),
  pokedex_number: z.number().optional(),
  nameJp: z.string().optional(),
  nameTranslations: DisplayNameSchema.optional(),
  imageUrl: z.string().optional(),
  userPokemon: z.boolean().default(false)
})

export const GetUserPokemonByPokemonIdwithListOwnershipSchema = UserPokemonSchema.extend({
  pokemon: PokemonSchema.pick({
    id: true,
    pokedex_number: true,
    nameJp: true,
    nameTranslations: true,
    imageUrl: true,
    rarity: true,
    conditionLevel: true
  }).extend({
    types: z.array(TypeSchema).optional(),
    weaknesses: z.array(WeaknessSchema).optional(),
    nextPokemons: z.array(NextPokemonSchema).optional(),
    previousPokemons: z.array(PrevPokemonSchema).optional()
  })
})

export const GetUserPokemonByPokemonIdwithListOwnershipResSchema = resSchema(
  GetUserPokemonByPokemonIdwithListOwnershipSchema
)

// Type exports
export type UserPokemonType = z.infer<typeof UserPokemonSchema>
export type CreateUserPokemonBodyType = z.infer<typeof CreateUserPokemonBodySchema>
export type UpdateUserPokemonBodyType = z.infer<typeof UpdateUserPokemonBodySchema>
export type GetUserPokemonParamsType = z.infer<typeof GetUserPokemonParamsSchema>
export type GetUserPokemonDetailResType = z.infer<typeof GetUserPokemonDetailResSchema>
export type AddExpBodyType = z.infer<typeof AddExpBodySchema>
export type EvolvePokemonBodyType = z.infer<typeof EvolvePokemonBodySchema>
export type EvolvePokemonResType = z.infer<typeof EvolvePokemonResSchema>

// Field for query
export type UserPokemonFieldType = keyof z.infer<typeof UserPokemonSchema>
export const USER_POKEMON_FIELDS = [
  ...Object.keys(UserPokemonSchema.shape),
  'userPokemon'
] as UserPokemonFieldType[]
