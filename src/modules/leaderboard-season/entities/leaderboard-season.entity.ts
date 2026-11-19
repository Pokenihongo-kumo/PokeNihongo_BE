import { LeaderboardStatus } from '@/common/constants/leaderboard.constants'
import { RewardSchema } from '@/modules/reward/entities/reward.entity'
import { SeasonRankRewardSchema } from '@/modules/season-rank-reward/entities/season-rank-reward.entity'
import { TranslationInputSchema } from '@/shared/models/translation-input.model'
import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'
extendZodWithOpenApi(z)
patchNestJsSwagger()

export const LeaderboardSeasonSchema = z.object({
  id: z.number(),
  nameKey: z.string(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  hasOpened: z.boolean().default(false),
  status: z
    .enum([
      LeaderboardStatus.INACTIVE,
      LeaderboardStatus.PREVIEW,
      LeaderboardStatus.ACTIVE,
      LeaderboardStatus.EXPIRED
    ])
    .default(LeaderboardStatus.PREVIEW),
  enablePrecreate: z.boolean().default(false), // bật/tắt tự tạo
  precreateBeforeEndDays: z.number().min(0).default(2), // tạo trước X ngày (mặc định 2)
  isRandomItemAgain: z.boolean().default(false), // có thể trùng item khi random lại
  createdById: z.number().nullable(),
  updatedById: z.number().nullable(),
  deletedById: z.number().nullable(),
  deletedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date()
})

export const GetLeaderboardWithRewardSeasonDetailSchema = LeaderboardSeasonSchema.pick({
  id: true,
  startDate: true,
  endDate: true,
  status: true
}).extend({
  nameTranslation: z.string().nullable().optional(),
  nameTranslations: TranslationInputSchema.nullable().optional(),
  seasonRankRewards: z.array(
    SeasonRankRewardSchema.pick({ id: true, rankName: true, order: true })
      .extend({
        rewards: z.array(
          RewardSchema.pick({
            id: true,
            rewardType: true,
            rewardItem: true,
            rewardTarget: true
          })
            .extend({
              nameTranslation: z.string().nullable().optional(),
              nameTranslations: TranslationInputSchema.optional().nullable()
            })
            .nullable()
        )
      })
      .nullable()
  )
})

export type LeaderboardSeason = z.infer<typeof LeaderboardSeasonSchema>
type LeaderboardSeasonFieldType = keyof z.infer<typeof LeaderboardSeasonSchema>
export const LEADERBOARD_SEASON_FIELDS = [
  ...Object.keys(LeaderboardSeasonSchema.shape),
  'nameTranslation'
] as LeaderboardSeasonFieldType[]
