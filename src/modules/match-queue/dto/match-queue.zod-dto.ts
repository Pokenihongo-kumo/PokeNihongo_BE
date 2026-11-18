import { checkIdSchema } from '@/common/utils/id.validation'
import { MatchQueueMessage } from '@/i18n/message-keys'
import { resSchema } from '@/shared/utils/res-schema'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import { MatchQueueSchema } from '../entities/match-queue.entity'

export const CreateMatchQueueBodySchema = MatchQueueSchema.pick({
  userId: true,
  userElo: true,
  status: true
}).strict()

export type CreateMatchQueueBody = z.infer<typeof CreateMatchQueueBodySchema>

export class CreatedMatchQueueBodyDTO extends createZodDto(CreateMatchQueueBodySchema) {}

export const CreateMatchQueueResSchema = resSchema(MatchQueueSchema)

export class CreateMatchQueueResDTO extends createZodDto(CreateMatchQueueResSchema) {}

export const UpdateMatchQueueBodySchema = CreateMatchQueueBodySchema.partial().strict()

export type UpdateMatchQueueBody = z.infer<typeof UpdateMatchQueueBodySchema>

export class UpdateMatchQueueBodyDTO extends createZodDto(UpdateMatchQueueBodySchema) {}

export const UpdateMatchQueueResSchema = CreateMatchQueueResSchema

export class UpdateMatchQueueResDTO extends createZodDto(UpdateMatchQueueResSchema) {}

export const GetMatchQueueParamsSchema = z
  .object({
    matchQueueId: checkIdSchema(MatchQueueMessage.INVALID_DATA)
  })
  .strict()

export type GetMatchQueueParams = z.infer<typeof GetMatchQueueParamsSchema>

export class GetMatchQueueParamsDTO extends createZodDto(GetMatchQueueParamsSchema) {}

export const GetMatchQueueDetailResSchema = resSchema(MatchQueueSchema)

export type GetMatchQueueDetailRes = z.infer<typeof GetMatchQueueDetailResSchema>

export class GetMatchQueueDetailResDTO extends createZodDto(
  GetMatchQueueDetailResSchema
) {}
