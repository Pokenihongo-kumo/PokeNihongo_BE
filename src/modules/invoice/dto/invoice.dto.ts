import { createZodDto } from 'nestjs-zod'
import {
  CreateInvoiceBodySchema,
  CreateInvoiceResSchema,
  GetInvoiceDetailResSchema,
  GetInvoiceParamsSchema,
  GetRewardByLeaderboardParamsSchema,
  UpdateInvoiceBodySchema,
  UpdateInvoiceResSchema
} from './invoice.zod-dto'

// Request DTOs
export class CreateInvoiceBodyDTO extends createZodDto(CreateInvoiceBodySchema) {}

export class UpdateInvoiceBodyDTO extends createZodDto(UpdateInvoiceBodySchema) {}

export class GetInvoiceParamsDTO extends createZodDto(GetInvoiceParamsSchema) {}

export class GetRewardByLeaderboardParamsDTO extends createZodDto(
  GetRewardByLeaderboardParamsSchema
) {}

// Response DTOs
export class CreateInvoiceResDTO extends createZodDto(CreateInvoiceResSchema) {}
export class UpdateInvoiceResDTO extends createZodDto(UpdateInvoiceResSchema) {}
export class GetInvoiceDetailResDTO extends createZodDto(GetInvoiceDetailResSchema) {}
