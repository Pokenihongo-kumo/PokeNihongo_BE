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

export const CreateMatchQueueResSchema = resSchema(MatchQueueSchema)

export type CreateMatchQueueRes = z.infer<typeof CreateMatchQueueResSchema>

export class CreateMatchQueueResDTO extends createZodDto(CreateMatchQueueResSchema) {}
