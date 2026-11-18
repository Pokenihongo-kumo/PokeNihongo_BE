import { ShopBannerStatus } from '@/common/constants/shop-banner.constant'
import { PokemonSchema } from '@/modules/pokemon/entities/pokemon.entity'
import { ShopItemSchema } from '@/modules/shop-item/entities/shop-item.entity'
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

export const GetShopBannerDetailByUserSchema = ShopBannerSchema.extend({
  nameTranslation: z.string(),
  shopItems: z.array(
    ShopItemSchema.extend({
      pokemon: PokemonSchema.optional(),
      canBuy: z.boolean()
    })
  )
}).nullable()

export type ShopBanner = z.infer<typeof ShopBannerSchema>
type ShopBannerFieldType = keyof z.infer<typeof ShopBannerSchema>
export const REWARD_FIELDS = [
  ...Object.keys(ShopBannerSchema.shape),
  'nameTranslation'
] as ShopBannerFieldType[]
