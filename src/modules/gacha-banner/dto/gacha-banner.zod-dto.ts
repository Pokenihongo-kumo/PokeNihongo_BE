import { checkIdSchema } from '@/common/utils/id.validation'
import { GachaBannerMessage } from '@/i18n/message-keys'
import { GachaItemRateSchema } from '@/modules/gacha-item-rate/entities/gacha-item-rate.entity'
import { GachaItemSchema } from '@/modules/gacha-item/entities/gacha-item.entity'
import { PokemonSchema } from '@/modules/pokemon/entities/pokemon.entity'
import { TranslationInputSchema } from '@/shared/models/translation-input.model'
import { resSchema } from '@/shared/utils/res-schema'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import {
  GachaBannerSchema,
  GetGachaBannerDetailByUserSchema
} from '../entities/gacha-banner.entity'

export const CreateGachaBannerBodyInputSchema = GachaBannerSchema.pick({
  startDate: true,
  endDate: true,
  status: true,
  hardPity5Star: true,
  enablePrecreate: true,
  precreateBeforeEndDays: true,
  isRandomItemAgain: true,
  costRoll: true,
  amount5Star: true,
  amount4Star: true,
  amount3Star: true,
  amount2Star: true,
  amount1Star: true
})
  .strict()
  .extend({
    nameTranslations: TranslationInputSchema
  })

export type CreateGachaBannerBodyInput = z.infer<typeof CreateGachaBannerBodyInputSchema>

export class CreatedGachaBannerBodyInputDTO extends createZodDto(
  CreateGachaBannerBodyInputSchema
) {}

export const CreateGachaBannerBodySchema = GachaBannerSchema.pick({
  nameKey: true,
  startDate: true,
  endDate: true,
  status: true,
  hardPity5Star: true,
  enablePrecreate: true,
  precreateBeforeEndDays: true,
  isRandomItemAgain: true,

  costRoll: true,
  amount5Star: true,
  amount4Star: true,
  amount3Star: true,
  amount2Star: true,
  amount1Star: true
}).strict()

export type CreateGachaBannerBody = z.infer<typeof CreateGachaBannerBodySchema>

export const CreateGachaBannerResSchema = resSchema(GachaBannerSchema)

export class CreateGachaBannerResDTO extends createZodDto(CreateGachaBannerResSchema) {}

export const UpdateGachaBannerBodyInputSchema =
  CreateGachaBannerBodyInputSchema.partial().strict()

export type UpdateGachaBannerBodyInput = z.infer<typeof UpdateGachaBannerBodyInputSchema>

export class UpdateGachaBannerBodyInputDTO extends createZodDto(
  UpdateGachaBannerBodyInputSchema
) {}

export const UpdateGachaBannerBodySchema = CreateGachaBannerBodySchema.partial().strict()

export type UpdateGachaBannerBody = z.infer<typeof UpdateGachaBannerBodySchema>

export const UpdateGachaBannerResSchema = CreateGachaBannerResSchema

export class UpdateGachaBannerResDTO extends createZodDto(UpdateGachaBannerResSchema) {}

export const GetGachaBannerParamsSchema = z
  .object({
    gachaBannerId: checkIdSchema(GachaBannerMessage.INVALID_DATA)
  })
  .strict()

export class GetGachaBannerParamsDTO extends createZodDto(GetGachaBannerParamsSchema) {}

export const GetGachaBannerDetailResSchema = resSchema(
  GachaBannerSchema.extend({
    nameTranslation: z.string(),
    nameTranslations: TranslationInputSchema.optional().nullable(),
    items: z.array(
      GachaItemSchema.extend({
        gachaItemRate: GachaItemRateSchema.pick({ rate: true, starType: true }),
        pokemon: PokemonSchema.pick({
          id: true,
          pokedex_number: true,
          nameJp: true,
          nameTranslations: true,
          imageUrl: true,
          rarity: true
        })
      })
    ),
    amount5StarCurrent: z.number().optional(),
    amount4StarCurrent: z.number().optional(),
    amount3StarCurrent: z.number().optional(),
    amount2StarCurrent: z.number().optional(),
    amount1StarCurrent: z.number().optional()
  })
)

export class GetGachaBannerDetailResDTO extends createZodDto(
  GetGachaBannerDetailResSchema
) {}

export const GetGachaBannerByTodayResSchema = resSchema(
  z.array(GetGachaBannerDetailByUserSchema)
)

export class GetGachaBannerByTodayResDTO extends createZodDto(
  GetGachaBannerByTodayResSchema
) {}
