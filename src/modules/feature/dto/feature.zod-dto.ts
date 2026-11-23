import { checkIdSchema } from '@/common/utils/id.validation'
import { FeatureMessage } from '@/i18n/message-keys'
import { TranslationInputSchema } from '@/shared/models/translation-input.model'
import { resSchema } from '@/shared/utils/res-schema'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import { FeatureSchema } from '../entities/feature.entity'

export const CreateFeatureBodyInputSchema = FeatureSchema.pick({
  featureKey: true
})
  .strict()
  .extend({
    nameTranslations: TranslationInputSchema
  })

export type CreateFeatureBodyInput = z.infer<typeof CreateFeatureBodyInputSchema>

export class CreatedFeatureBodyInputDTO extends createZodDto(
  CreateFeatureBodyInputSchema
) {}

export const CreateFeatureBodySchema = FeatureSchema.pick({
  nameKey: true,
  featureKey: true
}).strict()

export type CreateFeatureBody = z.infer<typeof CreateFeatureBodySchema>

export const CreateFeatureResSchema = resSchema(FeatureSchema)

export type CreateFeatureRes = z.infer<typeof CreateFeatureResSchema>

export class CreateFeatureResDTO extends createZodDto(CreateFeatureResSchema) {}

export const UpdateFeatureBodyInputSchema =
  CreateFeatureBodyInputSchema.partial().strict()

export type UpdateFeatureBodyInput = z.infer<typeof UpdateFeatureBodyInputSchema>

export class UpdateFeatureBodyInputDTO extends createZodDto(
  UpdateFeatureBodyInputSchema
) {}

export const UpdateFeatureBodySchema = CreateFeatureBodySchema.partial().strict()

export type UpdateFeatureBody = z.infer<typeof UpdateFeatureBodySchema>

export const UpdateFeatureResSchema = CreateFeatureResSchema

export type UpdateFeatureRes = z.infer<typeof UpdateFeatureResSchema>

export class UpdateFeatureResDTO extends createZodDto(UpdateFeatureResSchema) {}

export const GetFeatureParamsSchema = z
  .object({
    featureId: checkIdSchema(FeatureMessage.INVALID_DATA)
  })
  .strict()

export type GetFeatureParams = z.infer<typeof GetFeatureParamsSchema>

export class GetFeatureParamsDTO extends createZodDto(GetFeatureParamsSchema) {}

export const GetFeatureDetailResSchema = resSchema(
  FeatureSchema.extend({
    nameTranslation: z.string().nullable().optional(),
    nameTranslations: TranslationInputSchema.nullable().optional()
  })
)

export type GetFeatureDetailRes = z.infer<typeof GetFeatureDetailResSchema>

export class GetFeatureDetailResDTO extends createZodDto(GetFeatureDetailResSchema) {}
