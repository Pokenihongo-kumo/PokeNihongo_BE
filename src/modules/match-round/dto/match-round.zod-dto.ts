import { checkIdSchema } from '@/common/utils/id.validation'
import { MatchRoundMessage } from '@/i18n/message-keys'
import { MatchParticipantSchema } from '@/modules/match-participant/entities/match-participant.entity'
import { MatchRoundParticipantSchema } from '@/modules/match-round-participant/entities/match-round-participant.entity'
import { MatchSchema } from '@/modules/match/entities/match.entity'
import { PokemonSchema } from '@/modules/pokemon/entities/pokemon.entity'
import { UserPokemonSchema } from '@/modules/user-pokemon/entities/user-pokemon.entity'
import { UserSchema } from '@/shared/models/shared-user.model'
import { resSchema } from '@/shared/utils/res-schema'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import { MatchRoundSchema } from '../entities/match-round.entity'

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

export class GetMatchRoundDetailForUserResDTO extends createZodDto(
  GetMatchRoundDetailForUserResponseSchema
) {}

export const CreateMatchRoundBodySchema = MatchRoundSchema.pick({
  matchId: true,
  roundNumber: true
}).strict()

export type CreateMatchRoundBody = z.infer<typeof CreateMatchRoundBodySchema>

export class CreateMatchRoundBodyDTO extends createZodDto(CreateMatchRoundBodySchema) {}

export const CreateMatchRoundResSchema = resSchema(MatchRoundSchema)

export class CreateMatchRoundResDTO extends createZodDto(CreateMatchRoundResSchema) {}

export const UpdateMatchRoundBodySchema = CreateMatchRoundBodySchema.partial().strict()

export type UpdateMatchRoundBody = z.infer<typeof UpdateMatchRoundBodySchema>

export class UpdateMatchRoundBodyDTO extends createZodDto(UpdateMatchRoundBodySchema) {}

export const UpdateMatchRoundResSchema = CreateMatchRoundResSchema

export class UpdateMatchRoundResDTO extends createZodDto(UpdateMatchRoundResSchema) {}

export const GetMatchRoundParamsSchema = z
  .object({
    matchRoundId: checkIdSchema(MatchRoundMessage.INVALID_DATA)
  })
  .strict()

export type GetMatchRoundParams = z.infer<typeof GetMatchRoundParamsSchema>

export class GetMatchRoundParamsDTO extends createZodDto(GetMatchRoundParamsSchema) {}

export const GetMatchRoundDetailWithAllLangResSchema = resSchema(MatchRoundSchema)

export class GetMatchRoundDetailWithAllLangResDTO extends createZodDto(
  GetMatchRoundDetailWithAllLangResSchema
) {}

export const GetMatchRoundDetailResSchema = resSchema(MatchRoundSchema)

export type GetMatchRoundDetailRes = z.infer<typeof GetMatchRoundDetailResSchema>

export class GetMatchRoundDetailResDTO extends createZodDto(
  GetMatchRoundDetailResSchema
) {}
