import { MatchDebuffType } from '@/common/constants/debuff.constant'
import { checkIdSchema } from '@/common/utils/id.validation'
import { DebuffRoundMessage } from '@/i18n/message-keys'
import { TranslationInputSchema } from '@/shared/models/translation-input.model'
import { resSchema } from '@/shared/utils/res-schema'
import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'
extendZodWithOpenApi(z)
patchNestJsSwagger()

export const DebuffRoundSchema = z.object({
  id: z.number(),
  nameKey: z.string(),
  typeDebuff: z
    .enum([
      MatchDebuffType.ADD_QUESTION,
      MatchDebuffType.DECREASE_POINT,
      MatchDebuffType.DISCOMFORT_VISION
    ])
    .default(MatchDebuffType.ADD_QUESTION),
  valueDebuff: z.number(),
  createdById: z.number().nullable(),
  updatedById: z.number().nullable(),
  deletedById: z.number().nullable(),
  deletedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date()
})

export const CreateDebuffRoundBodyInputSchema = DebuffRoundSchema.pick({
  typeDebuff: true,
  valueDebuff: true
})
  .strict()
  .extend({
    nameTranslations: TranslationInputSchema
  })

export const CreateDebuffRoundBodySchema = DebuffRoundSchema.pick({
  nameKey: true,
  typeDebuff: true,
  valueDebuff: true
}).strict()

export const CreateDebuffRoundResSchema = resSchema(DebuffRoundSchema)

export const UpdateDebuffRoundBodyInputSchema =
  CreateDebuffRoundBodyInputSchema.partial().strict()

export const UpdateDebuffRoundBodySchema = CreateDebuffRoundBodySchema.partial().strict()

export const UpdateDebuffRoundResSchema = CreateDebuffRoundResSchema

export const GetDebuffRoundParamsSchema = z
  .object({
    debuffRoundId: checkIdSchema(DebuffRoundMessage.INVALID_DATA)
  })
  .strict()

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

export const GetDebuffRoundDetailResSchema = resSchema(
  DebuffRoundSchema.extend({
    nameTranslation: z.string().nullable().optional(),
    nameTranslations: TranslationInputSchema.optional().nullable()
  })
)

export type DebuffRoundType = z.infer<typeof DebuffRoundSchema>
export type CreateDebuffRoundBodyInputType = z.infer<
  typeof CreateDebuffRoundBodyInputSchema
>
export type CreateDebuffRoundBodyType = z.infer<typeof CreateDebuffRoundBodySchema>
export type UpdateDebuffRoundBodyInputType = z.infer<
  typeof UpdateDebuffRoundBodyInputSchema
>
export type UpdateDebuffRoundBodyType = z.infer<typeof UpdateDebuffRoundBodySchema>
export type GetDebuffRoundParamsType = z.infer<typeof GetDebuffRoundParamsSchema>
export type GetDebuffRoundDetailResType = z.infer<typeof GetDebuffRoundDetailResSchema>

type DebuffRoundFieldType = keyof z.infer<typeof DebuffRoundSchema>
export const DEBUFF_FIELDS = [
  ...Object.keys(DebuffRoundSchema.shape),
  'nameTranslation'
] as DebuffRoundFieldType[]
