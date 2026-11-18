import { ShopBannerStatus } from '@/common/constants/shop-banner.constant'
import { checkIdSchema } from '@/common/utils/id.validation'
import { ShopBannerMessage } from '@/i18n/message-keys'
import { PokemonSchema } from '@/modules/pokemon/entities/pokemon.entity'
import { ShopItemSchema } from '@/modules/shop-item/entities/shop-item.entity'
import { TranslationInputSchema } from '@/shared/models/translation-input.model'
import { resSchema } from '@/shared/utils/res-schema'
import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'
extendZodWithOpenApi(z)
patchNestJsSwagger()

export const ShopBannerSchema = z.object({
  id: z.number(),
  nameKey: z.string(),
  startDate: z.coerce.date().nullable(),
  endDate: z.coerce.date().nullable(),
  status: z
    .enum([
      ShopBannerStatus.ACTIVE,
      ShopBannerStatus.INACTIVE,
      ShopBannerStatus.EXPIRED,
      ShopBannerStatus.PREVIEW
    ])
    .default(ShopBannerStatus.PREVIEW),
  min: z.number().min(1).default(4),
  max: z.number().min(1).default(8),
  enablePrecreate: z.boolean().default(false), // bật/tắt tự tạo
  precreateBeforeEndDays: z.number().min(0).default(2), // tạo trước X ngày (mặc định 2)
  isRandomItemAgain: z.boolean().default(false), // có thể trùng item khi random lại

  createdById: z.number().nullable(),
  updatedById: z.number().nullable(),
  deletedById: z.number().nullable(),
  deletedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date()
})

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

export const CreateShopBannerResSchema = resSchema(ShopBannerSchema)

export const UpdateShopBannerBodyInputSchema =
  CreateShopBannerBodyInputSchema.partial().strict()

export const UpdateShopBannerBodySchema = CreateShopBannerBodySchema.partial().strict()

export const UpdateShopBannerResSchema = CreateShopBannerResSchema

export const GetShopBannerParamsSchema = z
  .object({
    shopBannerId: checkIdSchema(ShopBannerMessage.INVALID_DATA)
  })
  .strict()

export const GetShopBannerDetailByUserSchema = ShopBannerSchema.extend({
  nameTranslation: z.string(),
  shopItems: z.array(
    ShopItemSchema.extend({
      pokemon: PokemonSchema.optional(),
      canBuy: z.boolean()
    })
  )
}).nullable()

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

export const GetShopBannerByTodayResSchema = resSchema(GetShopBannerDetailByUserSchema)

export type ShopBanner = z.infer<typeof ShopBannerSchema>
export type CreateShopBannerBodyInput = z.infer<typeof CreateShopBannerBodyInputSchema>
export type CreateShopBannerBody = z.infer<typeof CreateShopBannerBodySchema>
export type UpdateShopBannerBodyInput = z.infer<typeof UpdateShopBannerBodyInputSchema>
export type UpdateShopBannerBody = z.infer<typeof UpdateShopBannerBodySchema>
export type GetShopBannerParams = z.infer<typeof GetShopBannerParamsSchema>
export type GetShopBannerDetailRes = z.infer<typeof GetShopBannerDetailResSchema>

type ShopBannerFieldType = keyof z.infer<typeof ShopBannerSchema>
export const REWARD_FIELDS = [
  ...Object.keys(ShopBannerSchema.shape),
  'nameTranslation'
] as ShopBannerFieldType[]
