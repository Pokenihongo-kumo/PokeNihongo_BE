import { LEVEL_TYPE } from '@/common/constants/level.constant'
import { LevelMessage } from '@/i18n/message-keys'
import { RewardSchema } from '@/modules/reward/entities/reward.entity'
import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'
extendZodWithOpenApi(z)
patchNestJsSwagger()

// Data shapes only; request and response schemas live in dto/level.zod-dto.ts

export const LevelSchema = z.object({
  id: z.number(),
  levelNumber: z.number().min(1, LevelMessage.LEVEL_NUMBER_MIN),
  requiredExp: z.number().min(0, LevelMessage.REQUIRED_EXP_REQUIRED),
  levelType: z.enum([LEVEL_TYPE.USER]),
  nextLevelId: z.number().optional().nullable(),
  rewardId: z.number().optional().nullable(),
  createdById: z.number().nullable(),
  updatedById: z.number().nullable(),
  deletedById: z.number().nullable(),
  deletedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date()
})

/** A level with its reward and the next level (without that level's own links) */
export const LevelWithRelationsSchema = z.object({
  ...LevelSchema.shape,
  reward: RewardSchema.nullable(),
  nextLevel: LevelSchema.omit({ nextLevelId: true, rewardId: true }).nullable()
})

export type Level = z.infer<typeof LevelSchema>

type LevelField = keyof Level
export const LEVEL_FIELDS = Object.keys(LevelSchema.shape) as LevelField[]
