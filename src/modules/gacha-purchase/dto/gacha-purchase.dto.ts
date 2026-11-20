import { createZodDto } from 'nestjs-zod'
import {
  CreateGachaPurchaseBodySchema,
  GetGachaPurchaseDetailResSchema,
  GetGachaPurchaseListResSchema,
  GetGachaPurchaseParamsSchema
} from './gacha-purchase.zod-dto'

// Request DTOs
export class CreateGachaPurchaseBodyDTO extends createZodDto(
  CreateGachaPurchaseBodySchema
) {}
export class GetGachaPurchaseParamsDTO extends createZodDto(
  GetGachaPurchaseParamsSchema
) {}
export class GetGachaPurchaseDetailResDTO extends createZodDto(
  GetGachaPurchaseDetailResSchema
) {}

export class GetGachaPurchaseListResDTO extends createZodDto(
  GetGachaPurchaseListResSchema
) {}
