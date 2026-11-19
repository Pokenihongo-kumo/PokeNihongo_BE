import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'
extendZodWithOpenApi(z)
patchNestJsSwagger()

export const AchievementGroupSchema = z.object({
  id: z.number(),
  nameKey: z.string().min(1),
  displayOrder: z.number().min(0),
  isActive: z.boolean().default(true),
  createdById: z.number().nullable(),
  updatedById: z.number().nullable(),
  deletedById: z.number().nullable(),
  deletedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date()
})

//type
export type AchievementGroup = z.infer<typeof AchievementGroupSchema>

// field
type AchievementGroupFieldType = keyof z.infer<typeof AchievementGroupSchema>
export const ACHIEVEMENT_GROUP_FIELDS = [
  ...Object.keys(AchievementGroupSchema.shape),
  'nameTranslation'
] as AchievementGroupFieldType[]
