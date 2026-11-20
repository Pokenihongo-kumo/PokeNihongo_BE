import { createZodDto } from 'nestjs-zod'
import {
  CreateInvoiceBodySchema,
  GetInvoiceDetailResSchema,
  GetInvoiceParamsSchema,
  UpdateInvoiceBodySchema,
  UpdateInvoiceResSchema
} from './invoice.zod-dto'

// Request DTOs
export class CreateInvoiceBodyDTO extends createZodDto(CreateInvoiceBodySchema) {}

export class UpdateInvoiceBodyDTO extends createZodDto(UpdateInvoiceBodySchema) {}

export class GetInvoiceParamsDTO extends createZodDto(GetInvoiceParamsSchema) {}
export class UpdateInvoiceResDTO extends createZodDto(UpdateInvoiceResSchema) {}
export class GetInvoiceDetailResDTO extends createZodDto(GetInvoiceDetailResSchema) {}
