import { checkIdSchema } from '@/common/utils/id.validation'
import { ENTITY_MESSAGE, InvoiceMessage } from '@/i18n/message-keys'
import { resSchema } from '@/shared/utils/res-schema'
import { z } from 'zod'
import { GetInvoiceDetailSchema, InvoiceSchema } from '../entities/invoice.entity'

// Create Schema

export const CreateInvoiceBodySchema = InvoiceSchema.pick({
  subscriptionPlanId: true
})
  .extend({
    // whole PokeCoins (10.5 used to be taken); the half-price cap is checked
    // against the plan in the service
    discountAmount: z
      .number()
      .int({ message: InvoiceMessage.INVALID_DATA })
      .min(0, { message: InvoiceMessage.INVALID_DATA })
  })
  .strict()

export type CreateInvoiceBody = z.infer<typeof CreateInvoiceBodySchema>

export const CreateInvoiceResSchema = resSchema(InvoiceSchema)

// Update Schema

export const UpdateInvoiceBodySchema = InvoiceSchema.pick({
  status: true
})
  .partial()
  .strict()

export type UpdateInvoiceBody = z.infer<typeof UpdateInvoiceBodySchema>

export const UpdateInvoiceResSchema = CreateInvoiceResSchema

// Query Schema

export const GetInvoiceParamsSchema = z.object({
  invoiceId: checkIdSchema(ENTITY_MESSAGE.INVALID_ID)
})

export const GetInvoiceDetailResSchema = resSchema(GetInvoiceDetailSchema)
