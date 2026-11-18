import { RarityPokemon } from '@/common/constants/pokemon.constant'
import { PokemonMessage } from '@/i18n/message-keys'
import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'

extendZodWithOpenApi(z)
patchNestJsSwagger()

// Base Pokemon Schema
export const PokemonSchema = z.object({
  id: z.number(),
  pokedex_number: z.number().min(1, PokemonMessage.POKEDEX_INVALID),
  nameJp: z.string().min(1, PokemonMessage.NAME_JP_INVALID),
  nameTranslations: z
    .any()
    .refine(
      (data) => data && typeof data === 'object' && data.en && data.ja && data.vi,
      PokemonMessage.NAME_TRANSLATIONS_INVALID
    ),
  description: z.string().nullable(),
  conditionLevel: z.number().min(1).nullable(),
  nextPokemonsId: z.array(z.number()).default([]).optional(),
  isStarted: z.boolean().default(false),
  imageUrl: z.string().url().nullable(),
  rarity: z
    .enum([
      RarityPokemon.COMMON,
      RarityPokemon.UNCOMMON,
      RarityPokemon.RARE,
      RarityPokemon.EPIC,
      RarityPokemon.LEGENDARY
    ])
    .default(RarityPokemon.COMMON),

  // Audit fields
  createdById: z.number().nullable(),
  updatedById: z.number().nullable(),
  deletedById: z.number().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable()
})

// Type exports
export type Pokemon = z.infer<typeof PokemonSchema>
// Field for query
export type PokemonFieldType = keyof z.infer<typeof PokemonSchema>
export const POKEMON_FIELDS = [
  ...Object.keys(PokemonSchema.shape),
  'nameTranslations.vi',
  'nameTranslations.en',
  'nameTranslations.ja',
  'types',
  'rarities'
] as PokemonFieldType[]
