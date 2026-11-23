import { z } from 'zod'
import { createZodDto } from 'nestjs-zod'
import {
  CreateInvoiceBodySchema,
  GetInvoiceDetailResSchema,
  GetInvoiceParamsSchema,
  UpdateInvoiceBodySchema,
  UpdateInvoiceResSchema
} from './invoice.zod-dto'

// Request DTOs

export type CreateInvoiceBody = z.infer<typeof CreateInvoiceBodySchema>

export class CreateInvoiceBodyDTO extends createZodDto(CreateInvoiceBodySchema) {}

export type UpdateInvoiceBody = z.infer<typeof UpdateInvoiceBodySchema>

export class UpdateInvoiceBodyDTO extends createZodDto(UpdateInvoiceBodySchema) {}

export type GetInvoiceParams = z.infer<typeof GetInvoiceParamsSchema>

export class GetInvoiceParamsDTO extends createZodDto(GetInvoiceParamsSchema) {}

export type UpdateInvoiceRes = z.infer<typeof UpdateInvoiceResSchema>

export class UpdateInvoiceResDTO extends createZodDto(UpdateInvoiceResSchema) {}

export type GetInvoiceDetailRes = z.infer<typeof GetInvoiceDetailResSchema>

export class GetInvoiceDetailResDTO extends createZodDto(GetInvoiceDetailResSchema) {}
