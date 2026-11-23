import { z } from 'zod'
import { createZodDto } from 'nestjs-zod'
import {
  CreateWithListItemBodySchema,
  CreateWithListItemResSchema,
  GetGachaItemDetailResSchema,
  GetGachaItemParamsSchema,
  GetRamdomAmountGachaItemsBodySchema,
  GetRandomGachaItemsResSchema,
  UpdateWithListItemBodySchema,
  UpdateWithListItemResSchema
} from './gacha-item.zod-dto'

export type CreateWithListItemBody = z.infer<typeof CreateWithListItemBodySchema>

export class CreateWithListItemBodyDTO extends createZodDto(
  CreateWithListItemBodySchema
) {}

export type UpdateWithListItemBody = z.infer<typeof UpdateWithListItemBodySchema>

export class UpdateWithListItemBodyDTO extends createZodDto(
  UpdateWithListItemBodySchema
) {}

export type GetGachaItemParams = z.infer<typeof GetGachaItemParamsSchema>

export class GetGachaItemParamsDTO extends createZodDto(GetGachaItemParamsSchema) {}
export type GetRamdomAmountGachaItemsBody = z.infer<
  typeof GetRamdomAmountGachaItemsBodySchema
>

export class GetRamdomAmountGachaItemsBodyDTO extends createZodDto(
  GetRamdomAmountGachaItemsBodySchema
) {}

export type CreateWithListItemRes = z.infer<typeof CreateWithListItemResSchema>

export class CreateWithListItemResDTO extends createZodDto(CreateWithListItemResSchema) {}

export type UpdateWithListItemRes = z.infer<typeof UpdateWithListItemResSchema>

export class UpdateWithListItemResDTO extends createZodDto(UpdateWithListItemResSchema) {}

export type GetGachaItemDetailRes = z.infer<typeof GetGachaItemDetailResSchema>

export class GetGachaItemDetailResDTO extends createZodDto(GetGachaItemDetailResSchema) {}

export type GetRandomGachaItemsRes = z.infer<typeof GetRandomGachaItemsResSchema>

export class GetRandomGachaItemsResDTO extends createZodDto(
  GetRandomGachaItemsResSchema
) {}
