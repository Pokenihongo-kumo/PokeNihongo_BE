import { InvoiceStatus } from '@/common/constants/invoice.constant'
import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'

extendZodWithOpenApi(z)
patchNestJsSwagger()

// Base Invoice Schema
export const InvoiceSchema = z.object({
  id: z.number(),
  userId: z.number(),
  subscriptionPlanId: z.number(),
  walletTransactionId: z.number().nullable(),
  subtotalAmount: z.number().min(0),
  discountAmount: z.number().min(0),
  totalAmount: z.number().min(0),
  status: z
    .enum([InvoiceStatus.PENDING, InvoiceStatus.PAID, InvoiceStatus.CANCELLED])
    .default(InvoiceStatus.PENDING),
  deletedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date()
})

export const GetInvoiceDetailSchema = InvoiceSchema

// Type exports
export type Invoice = z.infer<typeof InvoiceSchema>
// Field for query
export type InvoiceFieldType = keyof z.infer<typeof InvoiceSchema>
export const USER_SEASON_HISTORY_FIELDS = Object.keys(
  InvoiceSchema.shape
) as InvoiceFieldType[]
