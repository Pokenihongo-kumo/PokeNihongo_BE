import { z } from 'zod'
import { createZodDto } from 'nestjs-zod'
import {
  CreateGachaPurchaseBodySchema,
  GetGachaPurchaseDetailResSchema,
  GetGachaPurchaseListResSchema,
  GetGachaPurchaseParamsSchema
} from './gacha-purchase.zod-dto'

// Request DTOs

export type CreateGachaPurchaseBody = z.infer<typeof CreateGachaPurchaseBodySchema>

export class CreateGachaPurchaseBodyDTO extends createZodDto(
  CreateGachaPurchaseBodySchema
) {}

export type GetGachaPurchaseParams = z.infer<typeof GetGachaPurchaseParamsSchema>

export class GetGachaPurchaseParamsDTO extends createZodDto(
  GetGachaPurchaseParamsSchema
) {}

export type GetGachaPurchaseDetailRes = z.infer<typeof GetGachaPurchaseDetailResSchema>

export class GetGachaPurchaseDetailResDTO extends createZodDto(
  GetGachaPurchaseDetailResSchema
) {}

export type GetGachaPurchaseListRes = z.infer<typeof GetGachaPurchaseListResSchema>

export class GetGachaPurchaseListResDTO extends createZodDto(
  GetGachaPurchaseListResSchema
) {}
