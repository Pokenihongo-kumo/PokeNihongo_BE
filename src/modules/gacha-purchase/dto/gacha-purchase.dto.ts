import { createZodDto } from 'nestjs-zod'
import {
  CreateGachaPurchaseBodySchema,
  CreateGachaPurchaseResSchema,
  GetGachaPurchaseDetailResSchema,
  GetGachaPurchaseListResSchema,
  GetGachaPurchaseParamsSchema,
  UpdateGachaPurchaseBodySchema,
  UpdateGachaPurchaseResSchema
} from './gacha-purchase.zod-dto'

// Request DTOs
export class CreateGachaPurchaseBodyDTO extends createZodDto(
  CreateGachaPurchaseBodySchema
) {}
export class UpdateGachaPurchaseBodyDTO extends createZodDto(
  UpdateGachaPurchaseBodySchema
) {}
export class GetGachaPurchaseParamsDTO extends createZodDto(
  GetGachaPurchaseParamsSchema
) {}

// Response DTOs
export class CreateGachaPurchaseResDTO extends createZodDto(
  CreateGachaPurchaseResSchema
) {}
export class UpdateGachaPurchaseResDTO extends createZodDto(
  UpdateGachaPurchaseResSchema
) {}
export class GetGachaPurchaseDetailResDTO extends createZodDto(
  GetGachaPurchaseDetailResSchema
) {}

export class GetGachaPurchaseListResDTO extends createZodDto(
  GetGachaPurchaseListResSchema
) {}
