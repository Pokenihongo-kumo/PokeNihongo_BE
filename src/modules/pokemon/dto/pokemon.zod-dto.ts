import { RarityPokemon } from '@/common/constants/pokemon.constant'
import { checkIdSchema } from '@/common/utils/id.validation'
import { PokemonMessage } from '@/i18n/message-keys'
import { resSchema } from '@/shared/utils/res-schema'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import { PokemonSchema } from '../entities/pokemon.entity'
import { InvalidFormatException, NeedAtLeastOneTypeException } from './pokemon.error'

// Create Schema

export const CreatePokemonBodySchema = PokemonSchema.pick({
  pokedex_number: true,
  nameJp: true,
  nameTranslations: true,
  description: true,
  conditionLevel: true,
  nextPokemonsId: true,
  isStarted: true,
  imageUrl: true,
  rarity: true
})
  .extend({
    conditionLevel: PokemonSchema.shape.conditionLevel.optional(),
    imageUrl: PokemonSchema.shape.imageUrl.optional(),
    // Thêm field cho elemental types
    typeIds: z.array(z.number()).min(1, PokemonMessage.NEED_AT_LEAST_ONE_TYPE)
  })
  .strict()
  .refine(
    (data) => {
      // Nếu có nextPokemonsId thì phải có conditionLevel
      if (data.nextPokemonsId && data.nextPokemonsId.length > 0 && !data.conditionLevel) {
        return false
      }
      return true
    },
    {
      message: PokemonMessage.NEED_EVOLUTION,
      path: ['conditionLevel']
    }
  )

export type CreatePokemonBody = z.infer<typeof CreatePokemonBodySchema>

// Request DTOs
export class CreatePokemonBodyDTO extends createZodDto(CreatePokemonBodySchema) {}

// Form-data Schema (tất cả field đều là string từ form-data)

export const CreatePokemonFormDataSchema = z
  .object({
    pokedex_number: z.string().transform((val) => parseInt(val, 10)),
    nameJp: z.string().min(1, PokemonMessage.NAME_JP_REQUIRED),
    nameTranslations: z.string().transform((val) => {
      try {
        const parsed = JSON.parse(val)
        if (parsed && typeof parsed === 'object' && parsed.en && parsed.ja && parsed.vi) {
          return parsed
        }
        throw new InvalidFormatException()
      } catch {
        throw new InvalidFormatException()
      }
    }),
    description: z
      .string()
      .transform((val) => val || null)
      .optional(),
    conditionLevel: z
      .string()
      .transform((val) => (val ? parseInt(val, 10) : null))
      .optional(),
    nextPokemonsId: z
      .string()
      .transform((val) => {
        if (!val) return []
        try {
          const parsed = JSON.parse(val)
          if (Array.isArray(parsed) && parsed.every((id) => typeof id === 'number')) {
            return parsed
          }
          throw new InvalidFormatException()
        } catch {
          throw new InvalidFormatException()
        }
      })
      .optional(),
    isStarted: z
      .string()
      .transform((val) => val === 'true' || val === '1')
      .default('false'),
    imageUrl: z.string().optional().nullable(),
    rarity: z
      .enum([
        RarityPokemon.COMMON,
        RarityPokemon.UNCOMMON,
        RarityPokemon.RARE,
        RarityPokemon.EPIC,
        RarityPokemon.LEGENDARY
      ])
      .default(RarityPokemon.COMMON),
    // Thêm field cho elemental types (từ form-data sẽ là string JSON array)
    typeIds: z.string().transform((val) => {
      try {
        const parsed = JSON.parse(val)
        if (Array.isArray(parsed) && parsed.every((id) => typeof id === 'number')) {
          if (parsed.length < 1) throw new NeedAtLeastOneTypeException()
          return parsed
        }
        throw new InvalidFormatException()
      } catch {
        throw new InvalidFormatException()
      }
    })
  })
  .strict()
  .refine(
    (data) => {
      // Nếu có nextPokemons thì phải có conditionLevel
      if (data.nextPokemonsId && data.nextPokemonsId.length > 0 && !data.conditionLevel) {
        return false
      }
      return true
    },
    {
      message: PokemonMessage.NEED_EVOLUTION,
      path: ['conditionLevel']
    }
  )

export type CreatePokemonFormData = z.infer<typeof CreatePokemonFormDataSchema>

export const CreatePokemonResSchema = resSchema(
  PokemonSchema.omit({ nextPokemonsId: true })
)

// Response DTOs
export class CreatePokemonResDTO extends createZodDto(CreatePokemonResSchema) {}

// Update Schema

export const UpdatePokemonBodySchema = PokemonSchema.pick({
  pokedex_number: true,
  nameJp: true,
  nameTranslations: true,
  description: true,
  conditionLevel: true,
  nextPokemonsId: true,
  isStarted: true,
  imageUrl: true,
  rarity: true
})
  .extend({
    // Thêm field cho elemental types
    typeIds: z.array(z.number()).min(1, PokemonMessage.NEED_AT_LEAST_ONE_TYPE).optional()
  })
  .partial()
  .strict()
  .refine(
    (data) => {
      if (data.nextPokemonsId && data.nextPokemonsId.length > 0 && !data.conditionLevel) {
        return false
      }
      return true
    },
    {
      message: PokemonMessage.NEED_EVOLUTION,
      path: ['conditionLevel']
    }
  )

export type UpdatePokemonBody = z.infer<typeof UpdatePokemonBodySchema>

export class UpdatePokemonBodyDTO extends createZodDto(UpdatePokemonBodySchema) {}

// Form-data Schema cho Update

export const UpdatePokemonFormDataSchema = z
  .object({
    pokedex_number: z
      .string()
      .transform((val) => parseInt(val, 10))
      .optional(),
    nameJp: z.string().min(1, PokemonMessage.NAME_JP_REQUIRED).optional(),
    nameTranslations: z
      .string()
      .transform((val) => {
        try {
          const parsed = JSON.parse(val)
          if (
            parsed &&
            typeof parsed === 'object' &&
            parsed.en &&
            parsed.ja &&
            parsed.vi
          ) {
            return parsed
          }
          throw new InvalidFormatException()
        } catch {
          throw new InvalidFormatException()
        }
      })
      .optional(),
    description: z
      .string()
      .transform((val) => val || null)
      .optional(),
    conditionLevel: z
      .string()
      .transform((val) => (val ? parseInt(val, 10) : null))
      .optional(),
    nextPokemonsId: z
      .string()
      .transform((val) => {
        if (!val) return []
        try {
          const parsed = JSON.parse(val)
          if (Array.isArray(parsed) && parsed.every((id) => typeof id === 'number')) {
            return parsed
          }
          throw new InvalidFormatException()
        } catch {
          throw new InvalidFormatException()
        }
      })
      .optional(),
    isStarted: z
      .string()
      .transform((val) => val === 'true' || val === '1')
      .optional(),
    imageUrl: z.string().optional().nullable(),
    rarity: z
      .enum([
        RarityPokemon.COMMON,
        RarityPokemon.UNCOMMON,
        RarityPokemon.RARE,
        RarityPokemon.EPIC,
        RarityPokemon.LEGENDARY
      ])
      .optional(),
    // Thêm field cho elemental types (từ form-data sẽ là string JSON array)
    typeIds: z
      .string()
      .transform((val) => {
        try {
          const parsed = JSON.parse(val)
          if (Array.isArray(parsed) && parsed.every((id) => typeof id === 'number')) {
            if (parsed.length < 1) throw new NeedAtLeastOneTypeException()
            return parsed
          }
          throw new InvalidFormatException()
        } catch {
          throw new InvalidFormatException()
        }
      })
      .optional()
  })
  .strict()
  .refine(
    (data) => {
      // Nếu có nextPokemons thì phải có conditionLevel
      if (data.nextPokemonsId && data.nextPokemonsId.length > 0 && !data.conditionLevel) {
        return false
      }
      return true
    },
    {
      message: PokemonMessage.NEED_EVOLUTION,
      path: ['conditionLevel']
    }
  )

export type UpdatePokemonFormData = z.infer<typeof UpdatePokemonFormDataSchema>

export const UpdatePokemonResSchema = CreatePokemonResSchema

export class UpdatePokemonResDTO extends createZodDto(UpdatePokemonResSchema) {}

// Query Schema

export const GetPokemonParamsSchema = z.object({
  pokemonId: checkIdSchema(PokemonMessage.INVALID_ID)
})

export class GetPokemonParamsDTO extends createZodDto(GetPokemonParamsSchema) {}

export const GetPokemonResSchema = resSchema(z.array(PokemonSchema))

export class GetPokemonResDTO extends createZodDto(GetPokemonResSchema) {}

export const GetPokemonDetailResSchema = resSchema(
  PokemonSchema.omit({ nextPokemonsId: true }).extend({
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
    nextPokemons: z
      .array(
        PokemonSchema.omit({
          nextPokemonsId: true,
          createdById: true,
          updatedById: true,
          deletedById: true,
          createdAt: true,
          updatedAt: true,
          deletedAt: true
        })
      )
      .optional(),
    previousPokemons: z
      .array(
        PokemonSchema.omit({
          nextPokemonsId: true,
          createdById: true,
          updatedById: true,
          deletedById: true,
          createdAt: true,
          updatedAt: true,
          deletedAt: true
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
  })
)

export class GetPokemonDetailResDTO extends createZodDto(GetPokemonDetailResSchema) {}

// Pokemon Weakness Response Schema

export const GetPokemonWeaknessResSchema = resSchema(
  z.object({
    pokemon: z.object({
      id: z.number(),
      nameJp: z.string(),
      nameTranslations: z.any(),
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
    }),
    weaknesses: z.array(
      z.object({
        id: z.number(),
        type_name: z.string(),
        display_name: z.any(),
        color_hex: z.string(),
        effectiveness_multiplier: z.number()
      })
    )
  })
)

export class GetPokemonWeaknessResDTO extends createZodDto(GetPokemonWeaknessResSchema) {}

// Assign Types Schema

export const AssignPokemonTypesBodySchema = z
  .object({
    typeIds: z.array(z.number().min(1)).min(1, PokemonMessage.NEED_AT_LEAST_ONE_TYPE)
  })
  .strict()

export type AssignPokemonTypesBody = z.infer<typeof AssignPokemonTypesBodySchema>

// Evolution Schema

export const GetEvolutionOptionsResSchema = resSchema(
  z.array(
    z.object({
      id: z.number(),
      pokedex_number: z.number(),
      nameJp: z.string(),
      nameTranslations: z.any(),
      description: z.string().nullable(),
      imageUrl: z.string().nullable(),
      rarity: z.string()
    })
  )
)

export class GetEvolutionOptionsResDTO extends createZodDto(
  GetEvolutionOptionsResSchema
) {}
