import { checkIdSchema } from '@/common/utils/id.validation'
import { ENTITY_MESSAGE } from '@/i18n/message-keys'
import { resSchema } from '@/shared/utils/res-schema'
import { z } from 'zod'
import {
  GachaItemRateSchema,
  GetGachaItemRateDetailSchema
} from '../entities/gacha-item-rate.entity'

// Create Schema

export const CreateGachaItemRateBodySchema = GachaItemRateSchema.pick({
  starType: true,
  rate: true
}).strict()

export type CreateGachaItemRateBody = z.infer<typeof CreateGachaItemRateBodySchema>

export const CreateGachaItemRateResSchema = resSchema(GachaItemRateSchema)

// Update Schema

export const UpdateGachaItemRateBodySchema =
  CreateGachaItemRateBodySchema.partial().strict()

export type UpdateGachaItemRateBody = z.infer<typeof UpdateGachaItemRateBodySchema>

export const UpdateGachaItemRateResSchema = CreateGachaItemRateResSchema

export const UpdateWithListItemResSchema = resSchema(z.array(GachaItemRateSchema))

// Query Schema

export const GetGachaItemRateParamsSchema = z.object({
  gachaItemRateId: checkIdSchema(ENTITY_MESSAGE.INVALID_ID)
})

export type GetGachaItemRateParams = z.infer<typeof GetGachaItemRateParamsSchema>

export const GetGachaItemRateDetailResSchema = resSchema(GetGachaItemRateDetailSchema)
