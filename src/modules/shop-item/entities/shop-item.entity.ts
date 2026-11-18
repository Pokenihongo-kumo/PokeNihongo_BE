import { checkIdSchema } from '@/common/utils/id.validation'
import { ENTITY_MESSAGE } from '@/i18n/message-keys'
import { PokemonSchema } from '@/modules/pokemon/entities/pokemon.entity'
import { resSchema } from '@/shared/utils/res-schema'
import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'

extendZodWithOpenApi(z)
patchNestJsSwagger()

// Base ShopItem Schema
export const ShopItemSchema = z.object({
  id: z.number(),
  shopBannerId: z.number(),
  pokemonId: z.number(),
  price: z.number().min(0),
  purchaseLimit: z.number().min(0).nullable(),
  purchasedCount: z.number().default(0),
  isActive: z.boolean(),

  createdById: z.number().nullable(),
  updatedById: z.number().nullable(),
  deletedById: z.number().nullable(),
  deletedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date()
})

// Create Schema
export const CreateShopItemBodySchema = ShopItemSchema.pick({
  shopBannerId: true,
  pokemonId: true,
  price: true,
  purchaseLimit: true,
  isActive: true
}).strict()

export const CreateWithListItemBodySchema = z.object({
  items: z.array(CreateShopItemBodySchema).min(1, 'At least one item is required')
})

export const CreateShopItemResSchema = resSchema(ShopItemSchema)

export const CreateWithListItemResSchema = resSchema(z.array(ShopItemSchema))

// Update Schema
export const UpdateShopItemBodySchema = CreateShopItemBodySchema.extend({
  purchasedCount: z.number().min(0).optional()
})
  .partial()
  .strict()

export const UpdateShopItemResSchema = CreateShopItemResSchema

export const UpdateShopItemWithIdSchema = z
  .object({
    id: z.number().int().positive(),
    shopBannerId: z.number().optional(),
    pokemonId: z.number().optional(),
    price: z.number().min(0).optional(),
    purchaseLimit: z.number().min(0).nullable().optional(),
    isActive: z.boolean().optional(),
    purchasedCount: z.number().min(0).optional()
  })
  .strict()

export const UpdateWithListItemBodySchema = z.object({
  items: z.array(UpdateShopItemWithIdSchema).min(1)
})

export const UpdateWithListItemResSchema = resSchema(z.array(ShopItemSchema))

export const GetRamdomAmountShopItemBodySchema = z
  .object({
    amount: z.coerce.number().min(1).optional().nullable(),
    shopBannerId: z.coerce.number()
  })
  .strict()

export const GetRandomShopItemResSchema = resSchema(
  z.array(
    z.object({
      shopBannerId: z.number(),
      pokemonId: z.number(),
      price: z.number(),
      purchaseLimit: z.number(),
      isActive: z.boolean(),
      // Trả kèm thông tin Pokemon
      pokemon: PokemonSchema,

      isHas: z.boolean()
    })
  )
)

// Query Schema
export const GetShopItemParamsSchema = z.object({
  shopItemId: checkIdSchema(ENTITY_MESSAGE.INVALID_ID)
})

export const GetShopItemDetailSchema = ShopItemSchema.extend({
  // Use lazy to break circular dependency with ShopBannerSchema
  shopBanner: z
    .lazy(() => require('../../shop-banner/entities/shop-banner.entity').ShopBannerSchema)
    .optional(),
  pokemon: PokemonSchema.optional()
})

export const GetShopItemDetailResSchema = resSchema(GetShopItemDetailSchema)

// Type exports
export type ShopItem = z.infer<typeof ShopItemSchema>
export type CreateShopItemBody = z.infer<typeof CreateShopItemBodySchema>
export type CreateWithListItemBody = z.infer<typeof CreateWithListItemBodySchema>
export type UpdateShopItemBody = z.infer<typeof UpdateShopItemBodySchema>
export type UpdateShopItemWithId = z.infer<typeof UpdateShopItemWithIdSchema>
export type UpdateWithListItemBody = z.infer<typeof UpdateWithListItemBodySchema>
export type GetShopItemParams = z.infer<typeof GetShopItemParamsSchema>
export type GetShopItemDetail = z.infer<typeof GetShopItemDetailSchema>
export type GetRamdomAmountShopItemBody = z.infer<
  typeof GetRamdomAmountShopItemBodySchema
>
// Field for query
export type ShopItemFieldType = keyof z.infer<typeof ShopItemSchema>
export const SHOP_ITEM_FIELDS = Object.keys(ShopItemSchema.shape) as ShopItemFieldType[]
