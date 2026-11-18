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
export class CreateShopPurchaseBodyDTO extends createZodDto(
  CreateShopPurchaseBodySchema
) {}
export class UpdateShopPurchaseBodyDTO extends createZodDto(
  UpdateShopPurchaseBodySchema
) {}
export class GetShopPurchaseParamsDTO extends createZodDto(GetShopPurchaseParamsSchema) {}

// Response DTOs
export class CreateShopPurchaseResDTO extends createZodDto(CreateShopPurchaseResSchema) {}
export class UpdateShopPurchaseResDTO extends createZodDto(UpdateShopPurchaseResSchema) {}
export class GetShopPurchaseDetailResDTO extends createZodDto(
  GetShopPurchaseDetailResSchema
) {}

export class GetShopPurchaseListResDTO extends createZodDto(
  GetShopPurchaseListResSchema
) {}
