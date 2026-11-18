import { MatchDebuffType } from '@/common/constants/debuff.constant'
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

export type DebuffRound = z.infer<typeof DebuffRoundSchema>
type DebuffRoundFieldType = keyof z.infer<typeof DebuffRoundSchema>
export const DEBUFF_FIELDS = [
  ...Object.keys(DebuffRoundSchema.shape),
  'nameTranslation'
] as DebuffRoundFieldType[]
