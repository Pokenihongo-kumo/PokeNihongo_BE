import { LeaderboardSeasonSchema } from '@/modules/leaderboard-season/entities/leaderboard-season.entity'
import { LevelSchema } from '@/modules/level/entities/level.entity'
import { RoleSchema } from '@/shared/models/shared-role.model'
import { UserSchema } from '@/shared/models/shared-user.model'
import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'
extendZodWithOpenApi(z)
patchNestJsSwagger()

export const GetStatsUserSeasonSchema = z
  .object({
    leaderboardSeason: LeaderboardSeasonSchema.pick({
      id: true,

      startDate: true,
      endDate: true
    })
      .extend({
        name: z.string().nullable()
      })
      .nullable(),
    rank: z.object({
      rankName: z.string(),
      eloscore: z.number()
    }),
    totalMatches: z.number(),
    totalWins: z.number(),

    rateWin: z.number(),
    currentWinStreak: z.number()
  })

  .strict()

export const GetListMatchHisByUserSchema = z
  .object({
    isWin: z.boolean(),
    leaderboardSeasonName: z.string(),
    eloGain: z.number(),
    opponent: z.object({
      id: z.number(),
      name: z.string(),
      avatar: z.string().url().nullable()
    })
  })
  .strict()

export const UserWithoutPasswordSchema = z.object({
  ...UserSchema.omit({ password: true }).shape, // Không trả về password
  role: RoleSchema.omit({
    createdById: true,
    updatedById: true,
    deletedById: true
  })
    .nullable()
    .optional(),
  level: LevelSchema.omit({
    createdById: true,
    updatedById: true,
    deletedById: true
  })
    .nullable()
    .optional()
})

export type User = z.infer<typeof UserSchema>
export type UserWithoutPassword = z.infer<typeof UserWithoutPasswordSchema>
type UserFieldType = keyof z.infer<typeof UserSchema>
export const USER_FIELDS = Object.keys(UserSchema.shape) as UserFieldType[]
