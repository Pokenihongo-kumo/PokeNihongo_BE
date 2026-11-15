import { InvoiceStatus } from '@/common/constants/invoice.constant'
import { checkIdSchema } from '@/common/utils/id.validation'
import { ENTITY_MESSAGE, InvoiceMessage } from '@/i18n/message-keys'
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

export const CreateInvoiceResSchema = z.object({
  statusCode: z.number(),
  data: InvoiceSchema,
  message: z.string()
})

// Update Schema
export const UpdateInvoiceBodySchema = InvoiceSchema.pick({
  status: true
})
  .partial()
  .strict()

export const UpdateInvoiceResSchema = CreateInvoiceResSchema

// Query Schema
export const GetInvoiceParamsSchema = z.object({
  invoiceId: checkIdSchema(ENTITY_MESSAGE.INVALID_ID)
})

export const GetRewardByLeaderboardParamsSchema = z.object({
  leaderboardSeasonId: checkIdSchema(ENTITY_MESSAGE.INVALID_ID)
})

export const GetInvoiceDetailSchema = InvoiceSchema

export const GetInvoiceDetailResSchema = z.object({
  statusCode: z.number(),
  data: GetInvoiceDetailSchema,
  message: z.string()
})

// Type exports
export type InvoiceType = z.infer<typeof InvoiceSchema>
export type CreateInvoiceBodyType = z.infer<typeof CreateInvoiceBodySchema>
export type UpdateInvoiceBodyType = z.infer<typeof UpdateInvoiceBodySchema>
export type GetInvoiceParamsType = z.infer<typeof GetInvoiceParamsSchema>

// Field for query
export type InvoiceFieldType = keyof z.infer<typeof InvoiceSchema>
export const USER_SEASON_HISTORY_FIELDS = Object.keys(
  InvoiceSchema.shape
) as InvoiceFieldType[]
