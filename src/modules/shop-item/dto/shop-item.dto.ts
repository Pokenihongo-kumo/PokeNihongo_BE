import { z } from 'zod'
import { createZodDto } from 'nestjs-zod'
import {
  CreateShopItemBodySchema,
  CreateShopItemResSchema,
  CreateWithListItemBodySchema,
  CreateWithListItemResSchema,
  GetRamdomAmountShopItemBodySchema,
  GetRandomShopItemResSchema,
  GetShopItemDetailResSchema,
  GetShopItemParamsSchema,
  UpdateShopItemBodySchema,
  UpdateShopItemResSchema,
  UpdateWithListItemBodySchema,
  UpdateWithListItemResSchema
} from './shop-item.zod-dto'

// Request DTOs

export type CreateShopItemBody = z.infer<typeof CreateShopItemBodySchema>

export class CreateShopItemBodyDTO extends createZodDto(CreateShopItemBodySchema) {}

export type CreateWithListItemBody = z.infer<typeof CreateWithListItemBodySchema>

export class CreateWithListItemBodyDTO extends createZodDto(
  CreateWithListItemBodySchema
) {}

export type UpdateShopItemBody = z.infer<typeof UpdateShopItemBodySchema>

export class UpdateShopItemBodyDTO extends createZodDto(UpdateShopItemBodySchema) {}

export type UpdateWithListItemBody = z.infer<typeof UpdateWithListItemBodySchema>

export class UpdateWithListItemBodyDTO extends createZodDto(
  UpdateWithListItemBodySchema
) {}

export type GetShopItemParams = z.infer<typeof GetShopItemParamsSchema>

export class GetShopItemParamsDTO extends createZodDto(GetShopItemParamsSchema) {}
export type GetRamdomAmountShopItemBody = z.infer<
  typeof GetRamdomAmountShopItemBodySchema
>

export class GetRamdomAmountShopItemBodyDTO extends createZodDto(
  GetRamdomAmountShopItemBodySchema
) {}

// Response DTOs

export type CreateShopItemRes = z.infer<typeof CreateShopItemResSchema>

export class CreateShopItemResDTO extends createZodDto(CreateShopItemResSchema) {}

export type CreateWithListItemRes = z.infer<typeof CreateWithListItemResSchema>

export class CreateWithListItemResDTO extends createZodDto(CreateWithListItemResSchema) {}

export type UpdateShopItemRes = z.infer<typeof UpdateShopItemResSchema>

export class UpdateShopItemResDTO extends createZodDto(UpdateShopItemResSchema) {}

export type UpdateWithListItemRes = z.infer<typeof UpdateWithListItemResSchema>

export class UpdateWithListItemResDTO extends createZodDto(UpdateWithListItemResSchema) {}

export type GetShopItemDetailRes = z.infer<typeof GetShopItemDetailResSchema>

export class GetShopItemDetailResDTO extends createZodDto(GetShopItemDetailResSchema) {}

export type GetRandomShopItemRes = z.infer<typeof GetRandomShopItemResSchema>

export class GetRandomShopItemResDTO extends createZodDto(GetRandomShopItemResSchema) {}
