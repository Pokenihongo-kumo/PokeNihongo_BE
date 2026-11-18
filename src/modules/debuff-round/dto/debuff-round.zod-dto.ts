import { checkIdSchema } from '@/common/utils/id.validation'
import { DebuffRoundMessage } from '@/i18n/message-keys'
import { TranslationInputSchema } from '@/shared/models/translation-input.model'
import { resSchema } from '@/shared/utils/res-schema'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import { DebuffRoundSchema } from '../entities/debuff-round.entity'

export const CreateDebuffRoundBodyInputSchema = DebuffRoundSchema.pick({
  typeDebuff: true,
  valueDebuff: true
})
  .strict()
  .extend({
    nameTranslations: TranslationInputSchema
  })

export type CreateDebuffRoundBodyInput = z.infer<typeof CreateDebuffRoundBodyInputSchema>

export class CreatedDebuffRoundBodyInputDTO extends createZodDto(
  CreateDebuffRoundBodyInputSchema
) {}

export const CreateDebuffRoundBodySchema = DebuffRoundSchema.pick({
  nameKey: true,
  typeDebuff: true,
  valueDebuff: true
}).strict()

export type CreateDebuffRoundBody = z.infer<typeof CreateDebuffRoundBodySchema>

export const CreateDebuffRoundResSchema = resSchema(DebuffRoundSchema)

export class CreateDebuffRoundResDTO extends createZodDto(CreateDebuffRoundResSchema) {}

export const UpdateDebuffRoundBodyInputSchema =
  CreateDebuffRoundBodyInputSchema.partial().strict()

export type UpdateDebuffRoundBodyInput = z.infer<typeof UpdateDebuffRoundBodyInputSchema>

export class UpdateDebuffRoundBodyInputDTO extends createZodDto(
  UpdateDebuffRoundBodyInputSchema
) {}

export const UpdateDebuffRoundBodySchema = CreateDebuffRoundBodySchema.partial().strict()

export type UpdateDebuffRoundBody = z.infer<typeof UpdateDebuffRoundBodySchema>

export const UpdateDebuffRoundResSchema = CreateDebuffRoundResSchema

export class UpdateDebuffRoundResDTO extends createZodDto(UpdateDebuffRoundResSchema) {}

export const GetDebuffRoundParamsSchema = z
  .object({
    debuffRoundId: checkIdSchema(DebuffRoundMessage.INVALID_DATA)
  })
  .strict()

export type GetDebuffRoundParams = z.infer<typeof GetDebuffRoundParamsSchema>

export class GetDebuffRoundParamsDTO extends createZodDto(GetDebuffRoundParamsSchema) {}

export const GetDebuffRoundDetailWithAllLangResSchema = resSchema(
  DebuffRoundSchema.extend({
    nameTranslations: z
      .array(
        z.object({
          key: z.string(),
          value: z.string()
        })
      )
      .optional()
  })
)

export class GetDebuffRoundDetailWithAllLangResDTO extends createZodDto(
  GetDebuffRoundDetailWithAllLangResSchema
) {}

export const GetDebuffRoundDetailResSchema = resSchema(
  DebuffRoundSchema.extend({
    nameTranslation: z.string().nullable().optional(),
    nameTranslations: TranslationInputSchema.optional().nullable()
  })
)

export type GetDebuffRoundDetailRes = z.infer<typeof GetDebuffRoundDetailResSchema>

export class GetDebuffRoundDetailResDTO extends createZodDto(
  GetDebuffRoundDetailResSchema
) {}
