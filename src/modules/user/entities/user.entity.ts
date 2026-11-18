import { checkIdSchema } from '@/common/utils/id.validation'
import { UserMessage, ValidationMessage } from '@/i18n/message-keys'
import { LeaderboardSeasonSchema } from '@/modules/leaderboard-season/entities/leaderboard-season.entity'
import { LevelSchema } from '@/modules/level/entities/level.entity'
import { RoleSchema } from '@/shared/models/shared-role.model'
import { UserSchema } from '@/shared/models/shared-user.model'
import { resSchema } from '@/shared/utils/res-schema'
import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'
extendZodWithOpenApi(z)
patchNestJsSwagger()

export const CreateUserBodySchema = UserSchema.pick({
  email: true,
  name: true,
  roleId: true,
  phoneNumber: true,
  avatar: true
})
  .extend({
    avatar: z.string().url().optional()
  })
  .strict()

export const CreateUserResSchema = resSchema(UserSchema.omit({ password: true }))

export const UpdateUserBodySchema = UserSchema.pick({
  name: true,
  phoneNumber: true,
  avatar: true,
  status: true,
  roleId: true,
  levelId: true,
  password: true,
  exp: true
})
  .partial()
  .strict()

export const UpdateUserResSchema = CreateUserResSchema

export const GetUserParamsSchema = z
  .object({
    userId: checkIdSchema(ValidationMessage.INVALID_USER_ID)
  })
  .strict()

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

export const GetUserStatsSeasonResSchema = resSchema(GetStatsUserSeasonSchema)

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

export const GetListMatchHisByUserResSchema = resSchema(
  z.array(GetListMatchHisByUserSchema)
)

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

export const GetUserDetailResSchema = resSchema(UserWithoutPasswordSchema)

export const SetMainPokemonBodySchema = z
  .object({
    pokemonId: z
      .number()
      .int(UserMessage.INVALID_POKEMON_ID)
      .min(1, UserMessage.INVALID_POKEMON_ID)
  })
  .strict()

export type User = z.infer<typeof UserSchema>
export type CreateUserBody = z.infer<typeof CreateUserBodySchema>
export type UpdateUserBody = z.infer<typeof UpdateUserBodySchema>
export type GetUserParams = z.infer<typeof GetUserParamsSchema>
export type GetUserDetailRes = z.infer<typeof GetUserDetailResSchema>
export type UserWithoutPassword = z.infer<typeof UserWithoutPasswordSchema>
export type SetMainPokemonBody = z.infer<typeof SetMainPokemonBodySchema>

type UserFieldType = keyof z.infer<typeof UserSchema>
export const USER_FIELDS = Object.keys(UserSchema.shape) as UserFieldType[]
