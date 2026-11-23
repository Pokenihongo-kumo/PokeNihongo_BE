import { checkIdSchema } from '@/common/utils/id.validation'
import { ShopBannerMessage } from '@/i18n/message-keys'
import { PokemonSchema } from '@/modules/pokemon/entities/pokemon.entity'
import { ShopItemSchema } from '@/modules/shop-item/entities/shop-item.entity'
import { TranslationInputSchema } from '@/shared/models/translation-input.model'
import { resSchema } from '@/shared/utils/res-schema'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import {
  GetShopBannerDetailByUserSchema,
  ShopBannerSchema
} from '../entities/shop-banner.entity'

export const CreateShopBannerBodyInputSchema = ShopBannerSchema.pick({
  startDate: true,
  min: true,
  max: true,
  endDate: true,
  status: true,
  enablePrecreate: true,
  precreateBeforeEndDays: true,
  isRandomItemAgain: true
})
  .strict()
  .extend({
    nameTranslations: TranslationInputSchema
  })

export type CreateShopBannerBodyInput = z.infer<typeof CreateShopBannerBodyInputSchema>

export class CreatedShopBannerBodyInputDTO extends createZodDto(
  CreateShopBannerBodyInputSchema
) {}

export const CreateShopBannerBodySchema = ShopBannerSchema.pick({
  nameKey: true,
  startDate: true,
  endDate: true,
  status: true,
  min: true,
  max: true,
  enablePrecreate: true,
  precreateBeforeEndDays: true,
  isRandomItemAgain: true
}).strict()

export type CreateShopBannerBody = z.infer<typeof CreateShopBannerBodySchema>

export const CreateShopBannerResSchema = resSchema(ShopBannerSchema)

export type CreateShopBannerRes = z.infer<typeof CreateShopBannerResSchema>

export class CreateShopBannerResDTO extends createZodDto(CreateShopBannerResSchema) {}

export const UpdateShopBannerBodyInputSchema =
  CreateShopBannerBodyInputSchema.partial().strict()

export type UpdateShopBannerBodyInput = z.infer<typeof UpdateShopBannerBodyInputSchema>

export class UpdateShopBannerBodyInputDTO extends createZodDto(
  UpdateShopBannerBodyInputSchema
) {}

export const UpdateShopBannerBodySchema = CreateShopBannerBodySchema.partial().strict()

export type UpdateShopBannerBody = z.infer<typeof UpdateShopBannerBodySchema>

export const UpdateShopBannerResSchema = CreateShopBannerResSchema

export type UpdateShopBannerRes = z.infer<typeof UpdateShopBannerResSchema>

export class UpdateShopBannerResDTO extends createZodDto(UpdateShopBannerResSchema) {}

export const GetShopBannerParamsSchema = z
  .object({
    shopBannerId: checkIdSchema(ShopBannerMessage.INVALID_DATA)
  })
  .strict()

export type GetShopBannerParams = z.infer<typeof GetShopBannerParamsSchema>

export class GetShopBannerParamsDTO extends createZodDto(GetShopBannerParamsSchema) {}

export const GetShopBannerDetailResSchema = resSchema(
  ShopBannerSchema.extend({
    nameTranslation: z.string().nullable(),
    nameTranslations: TranslationInputSchema.optional().nullable(),
    shopItems: z.array(
      z.object({
        ...ShopItemSchema.shape,
        pokemon: PokemonSchema.pick({
          pokedex_number: true,
          nameJp: true,
          nameTranslations: true,
          imageUrl: true,
          rarity: true
        })
      })
    )
  })
)

export type GetShopBannerDetailRes = z.infer<typeof GetShopBannerDetailResSchema>

export class GetShopBannerDetailResDTO extends createZodDto(
  GetShopBannerDetailResSchema
) {}

export const GetShopBannerByTodayResSchema = resSchema(GetShopBannerDetailByUserSchema)

export type GetShopBannerByTodayRes = z.infer<typeof GetShopBannerByTodayResSchema>

export class GetShopBannerByTodayResDTO extends createZodDto(
  GetShopBannerByTodayResSchema
) {}
