import { checkIdSchema } from '@/common/utils/id.validation'
import { MatchMessage } from '@/i18n/message-keys'
import { resSchema } from '@/shared/utils/res-schema'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import { MatchSchema } from '../entities/match.entity'

export const CreateMatchBodySchema = MatchSchema.pick({})

  .strict()

export type CreateMatchBody = z.infer<typeof CreateMatchBodySchema>

export const CreateMatchResSchema = resSchema(MatchSchema)

export class CreateMatchResDTO extends createZodDto(CreateMatchResSchema) {}

export const UpdateMatchBodySchema = CreateMatchBodySchema.partial().strict()

export type UpdateMatchBody = z.infer<typeof UpdateMatchBodySchema>

export class UpdateMatchBodyDTO extends createZodDto(UpdateMatchBodySchema) {}

export const UpdateMatchResSchema = CreateMatchResSchema

export class UpdateMatchResDTO extends createZodDto(UpdateMatchResSchema) {}

export const GetMatchParamsSchema = z
  .object({
    matchId: checkIdSchema(MatchMessage.INVALID_DATA)
  })
  .strict()

export class GetMatchParamsDTO extends createZodDto(GetMatchParamsSchema) {}

export const GetMatchDetailResSchema = resSchema(MatchSchema)

export class GetMatchDetailResDTO extends createZodDto(GetMatchDetailResSchema) {}
