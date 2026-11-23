import { z } from 'zod'
import { createZodDto } from 'nestjs-zod'
import {
  CreateShopPurchaseBodySchema,
  CreateShopPurchaseResSchema,
  GetShopPurchaseDetailResSchema,
  GetShopPurchaseListResSchema,
  GetShopPurchaseParamsSchema,
  UpdateShopPurchaseBodySchema,
  UpdateShopPurchaseResSchema
} from './shop-purchase.zod-dto'

// Request DTOs

export type CreateShopPurchaseBody = z.infer<typeof CreateShopPurchaseBodySchema>

export class CreateShopPurchaseBodyDTO extends createZodDto(
  CreateShopPurchaseBodySchema
) {}

export type UpdateShopPurchaseBody = z.infer<typeof UpdateShopPurchaseBodySchema>

export class UpdateShopPurchaseBodyDTO extends createZodDto(
  UpdateShopPurchaseBodySchema
) {}

export type GetShopPurchaseParams = z.infer<typeof GetShopPurchaseParamsSchema>

export class GetShopPurchaseParamsDTO extends createZodDto(GetShopPurchaseParamsSchema) {}

// Response DTOs

export type CreateShopPurchaseRes = z.infer<typeof CreateShopPurchaseResSchema>

export class CreateShopPurchaseResDTO extends createZodDto(CreateShopPurchaseResSchema) {}

export type UpdateShopPurchaseRes = z.infer<typeof UpdateShopPurchaseResSchema>

export class UpdateShopPurchaseResDTO extends createZodDto(UpdateShopPurchaseResSchema) {}

export type GetShopPurchaseDetailRes = z.infer<typeof GetShopPurchaseDetailResSchema>

export class GetShopPurchaseDetailResDTO extends createZodDto(
  GetShopPurchaseDetailResSchema
) {}

export type GetShopPurchaseListRes = z.infer<typeof GetShopPurchaseListResSchema>

export class GetShopPurchaseListResDTO extends createZodDto(
  GetShopPurchaseListResSchema
) {}
