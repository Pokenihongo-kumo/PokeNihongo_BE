import { UserPokemonMessage } from '@/i18n/message-keys'
import { PokemonSchema } from '@/modules/pokemon/entities/pokemon.entity'
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

// Type exports
export type UserPokemon = z.infer<typeof UserPokemonSchema>
// Field for query
export type UserPokemonFieldType = keyof z.infer<typeof UserPokemonSchema>
export const USER_POKEMON_FIELDS = [
  ...Object.keys(UserPokemonSchema.shape),
  'userPokemon'
] as UserPokemonFieldType[]
