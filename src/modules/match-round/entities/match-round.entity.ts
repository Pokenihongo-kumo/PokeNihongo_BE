import { MatchRoundNumber, RoundStatus } from '@/common/constants/match.constant'
import { checkIdSchema } from '@/common/utils/id.validation'
import { MatchRoundMessage } from '@/i18n/message-keys'
import { MatchParticipantSchema } from '@/modules/match-participant/entities/match-participant.entity'
import { MatchRoundParticipantSchema } from '@/modules/match-round-participant/entities/match-round-participant.entity'
import { MatchSchema } from '@/modules/match/entities/match.entity'
import { PokemonSchema } from '@/modules/pokemon/entities/pokemon.entity'
import { UserPokemonSchema } from '@/modules/user-pokemon/entities/user-pokemon.entity'
import { UserSchema } from '@/shared/models/shared-user.model'
import { resSchema } from '@/shared/utils/res-schema'
import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'
extendZodWithOpenApi(z)
patchNestJsSwagger()

export const MatchRoundSchema = z.object({
  id: z.number(),
  matchId: z.number(),
  roundNumber: z
    .enum([MatchRoundNumber.ONE, MatchRoundNumber.TWO, MatchRoundNumber.THREE])
    .default(MatchRoundNumber.ONE),
  status: z
    .enum([
      RoundStatus.SELECTING_POKEMON,
      RoundStatus.PENDING,
      RoundStatus.IN_PROGRESS,
      RoundStatus.COMPLETED
    ])
    .default(RoundStatus.SELECTING_POKEMON),
  endTimeRound: z.date().nullable(),
  roundWinnerId: z.number().optional().nullable(),
  deletedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date()
})

export const GetMatchRoundDetailForUserResSchema = z.object({
  match: MatchSchema.pick({
    id: true,
    status: true
  })
    .extend({
      participants: z.array(
        MatchParticipantSchema.pick({
          id: true,
          userId: true
        }).extend({
          user: UserSchema.pick({
            id: true,
            name: true,
            email: true,
            eloscore: true,
            avatar: true
          })
        })
      )
    })
    .nullable(),
  rounds: z.array(
    MatchRoundSchema.pick({
      id: true,
      roundNumber: true,
      status: true,
      endTimeRound: true
    }).extend({
      participants: z.array(
        MatchRoundParticipantSchema.pick({
          id: true,
          matchParticipantId: true,
          orderSelected: true,
          endTimeSelected: true,
          selectedUserPokemonId: true
        }).extend({
          selectedUserPokemon: UserPokemonSchema.pick({
            id: true,
            userId: true,
            pokemonId: true
          })
            .extend({
              pokemon: PokemonSchema.pick({
                id: true,
                pokedex_number: true,
                nameJp: true,
                nameTranslations: true,
                imageUrl: true,
                rarity: true
              }).nullable()
            })
            .nullable()
        })
      )
    })
  )
})

// Wrapper response schema with statusCode and message
export const GetMatchRoundDetailForUserResponseSchema = z.object({
  statusCode: z.number().optional(),
  data: GetMatchRoundDetailForUserResSchema,
  message: z.string()
})

export const CreateMatchRoundBodySchema = MatchRoundSchema.pick({
  matchId: true,
  roundNumber: true
}).strict()

export const CreateMatchRoundResSchema = resSchema(MatchRoundSchema)

export const UpdateMatchRoundBodySchema = CreateMatchRoundBodySchema.partial().strict()

export const UpdateMatchRoundResSchema = CreateMatchRoundResSchema

export const GetMatchRoundParamsSchema = z
  .object({
    matchRoundId: checkIdSchema(MatchRoundMessage.INVALID_DATA)
  })
  .strict()

export const GetMatchRoundDetailWithAllLangResSchema = resSchema(MatchRoundSchema)

export const GetMatchRoundDetailResSchema = resSchema(MatchRoundSchema)

export type MatchRound = z.infer<typeof MatchRoundSchema>

export type CreateMatchRoundBody = z.infer<typeof CreateMatchRoundBodySchema>

export type UpdateMatchRoundBody = z.infer<typeof UpdateMatchRoundBodySchema>
export type GetMatchRoundParams = z.infer<typeof GetMatchRoundParamsSchema>
export type GetMatchRoundDetailRes = z.infer<typeof GetMatchRoundDetailResSchema>

type MatchRoundFieldType = keyof z.infer<typeof MatchRoundSchema>
export const MATCH_FIELDS = [
  ...Object.keys(MatchRoundSchema.shape)
] as MatchRoundFieldType[]
