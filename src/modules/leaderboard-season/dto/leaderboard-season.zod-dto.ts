import { checkIdSchema } from '@/common/utils/id.validation'
import { LeaderboardSeasonMessage } from '@/i18n/message-keys'
import { RewardSchema } from '@/modules/reward/entities/reward.entity'
import { SeasonRankRewardSchema } from '@/modules/season-rank-reward/entities/season-rank-reward.entity'
import { TranslationInputSchema } from '@/shared/models/translation-input.model'
import { resSchema } from '@/shared/utils/res-schema'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import {
  GetLeaderboardWithRewardSeasonDetailSchema,
  LeaderboardSeasonSchema
} from '../entities/leaderboard-season.entity'

export const CreateLeaderboardSeasonBodyInputSchema = LeaderboardSeasonSchema.pick({
  startDate: true,
  endDate: true,
  status: true,
  enablePrecreate: true,
  precreateBeforeEndDays: true,
  isRandomItemAgain: true
})
  .strict()
  .extend({
    nameTranslations: TranslationInputSchema,
    startDate: z.coerce.date().nullable().optional(),
    endDate: z.coerce.date().nullable().optional()
  })

export type CreateLeaderboardSeasonBodyInput = z.infer<
  typeof CreateLeaderboardSeasonBodyInputSchema
>

export class CreatedLeaderboardSeasonBodyInputDTO extends createZodDto(
  CreateLeaderboardSeasonBodyInputSchema
) {}

export const CreateLeaderboardSeasonBodySchema = LeaderboardSeasonSchema.pick({
  nameKey: true,
  startDate: true,
  endDate: true,
  status: true,
  enablePrecreate: true,
  precreateBeforeEndDays: true,
  isRandomItemAgain: true
}).strict()

export type CreateLeaderboardSeasonBody = z.infer<
  typeof CreateLeaderboardSeasonBodySchema
>

export const CreateLeaderboardSeasonResSchema = resSchema(LeaderboardSeasonSchema)

export class CreateLeaderboardSeasonResDTO extends createZodDto(
  CreateLeaderboardSeasonResSchema
) {}

export const UpdateLeaderboardSeasonBodyInputSchema =
  CreateLeaderboardSeasonBodyInputSchema.partial().strict()

export type UpdateLeaderboardSeasonBodyInput = z.infer<
  typeof UpdateLeaderboardSeasonBodyInputSchema
>

export class UpdateLeaderboardSeasonBodyInputDTO extends createZodDto(
  UpdateLeaderboardSeasonBodyInputSchema
) {}

export const UpdateLeaderboardSeasonBodySchema =
  CreateLeaderboardSeasonBodySchema.partial().strict()

export type UpdateLeaderboardSeasonBody = z.infer<
  typeof UpdateLeaderboardSeasonBodySchema
>

export const UpdateLeaderboardSeasonResSchema = CreateLeaderboardSeasonResSchema

export class UpdateLeaderboardSeasonResDTO extends createZodDto(
  UpdateLeaderboardSeasonResSchema
) {}

export const GetLeaderboardSeasonParamsSchema = z
  .object({
    leaderboardSeasonId: checkIdSchema(LeaderboardSeasonMessage.INVALID_DATA)
  })
  .strict()

export type GetLeaderboardSeasonParams = z.infer<typeof GetLeaderboardSeasonParamsSchema>

export class GetLeaderboardSeasonParamsDTO extends createZodDto(
  GetLeaderboardSeasonParamsSchema
) {}

export const GetLeaderboardSeasonDetailWithAllLangResSchema = resSchema(
  LeaderboardSeasonSchema.extend({
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

export class GetLeaderboardSeasonDetailWithAllLangResDTO extends createZodDto(
  GetLeaderboardSeasonDetailWithAllLangResSchema
) {}

export const GetLeaderboardWithRewardSeasonDetailResSchema = resSchema(
  GetLeaderboardWithRewardSeasonDetailSchema
)

export class GetLeaderboardWithRewardSeasonDetailResDTO extends createZodDto(
  GetLeaderboardWithRewardSeasonDetailResSchema
) {}

export const GetLeaderboardSeasonDetailResSchema = resSchema(
  LeaderboardSeasonSchema.extend({
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
)

export type GetLeaderboardSeasonDetailRes = z.infer<
  typeof GetLeaderboardSeasonDetailResSchema
>

export class GetLeaderboardSeasonDetailResDTO extends createZodDto(
  GetLeaderboardSeasonDetailResSchema
) {}
