import { checkIdSchema } from '@/common/utils/id.validation'
import { ENTITY_MESSAGE } from '@/i18n/message-keys'
import { PokemonSchema } from '@/modules/pokemon/entities/pokemon.entity'
import { resSchema } from '@/shared/utils/res-schema'
import { z } from 'zod'
import { GetShopItemDetailSchema, ShopItemSchema } from '../entities/shop-item.entity'

// Create Schema

export const CreateShopItemBodySchema = ShopItemSchema.pick({
  shopBannerId: true,
  pokemonId: true,
  price: true,
  purchaseLimit: true,
  isActive: true
}).strict()

export type CreateShopItemBody = z.infer<typeof CreateShopItemBodySchema>

export const CreateWithListItemBodySchema = z.object({
  items: z.array(CreateShopItemBodySchema).min(1, 'At least one item is required')
})

export type CreateWithListItemBody = z.infer<typeof CreateWithListItemBodySchema>

export const CreateShopItemResSchema = resSchema(ShopItemSchema)

export const CreateWithListItemResSchema = resSchema(z.array(ShopItemSchema))

// Update Schema

export const UpdateShopItemBodySchema = CreateShopItemBodySchema.extend({
  purchasedCount: z.number().min(0).optional()
})
  .partial()
  .strict()

export type UpdateShopItemBody = z.infer<typeof UpdateShopItemBodySchema>

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

export type UpdateShopItemWithId = z.infer<typeof UpdateShopItemWithIdSchema>

export const UpdateWithListItemBodySchema = z.object({
  items: z.array(UpdateShopItemWithIdSchema).min(1)
})

export type UpdateWithListItemBody = z.infer<typeof UpdateWithListItemBodySchema>

export const UpdateWithListItemResSchema = resSchema(z.array(ShopItemSchema))

export const GetRamdomAmountShopItemBodySchema = z
  .object({
    amount: z.coerce.number().min(1).optional().nullable(),
    shopBannerId: z.coerce.number()
  })
  .strict()

export type GetRamdomAmountShopItemBody = z.infer<
  typeof GetRamdomAmountShopItemBodySchema
>

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

export type GetShopItemParams = z.infer<typeof GetShopItemParamsSchema>

export const GetShopItemDetailResSchema = resSchema(GetShopItemDetailSchema)
