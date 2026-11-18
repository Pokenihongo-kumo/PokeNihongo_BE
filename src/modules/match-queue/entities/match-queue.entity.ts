import { checkIdSchema } from '@/common/utils/id.validation'
import { MatchQueueMessage } from '@/i18n/message-keys'
import { resSchema } from '@/shared/utils/res-schema'
import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { QueueStatus } from '@prisma/client'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'
extendZodWithOpenApi(z)
patchNestJsSwagger()

export const MatchQueueSchema = z.object({
  id: z.number(),
  userId: z.number(),
  userElo: z.number().min(0),
  status: z.nativeEnum(QueueStatus).default(QueueStatus.WAITING),
  deletedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date()
})

export const CreateMatchQueueBodySchema = MatchQueueSchema.pick({
  userId: true,
  userElo: true,
  status: true
}).strict()

export const CreateMatchQueueResSchema = resSchema(MatchQueueSchema)

export const UpdateMatchQueueBodySchema = CreateMatchQueueBodySchema.partial().strict()

export const UpdateMatchQueueResSchema = CreateMatchQueueResSchema

export const GetMatchQueueParamsSchema = z
  .object({
    matchQueueId: checkIdSchema(MatchQueueMessage.INVALID_DATA)
  })
  .strict()

export const GetMatchQueueDetailResSchema = resSchema(MatchQueueSchema)

export type MatchQueueType = z.infer<typeof MatchQueueSchema>
export type CreateMatchQueueBodyType = z.infer<typeof CreateMatchQueueBodySchema>
export type UpdateMatchQueueBodyType = z.infer<typeof UpdateMatchQueueBodySchema>
export type GetMatchQueueParamsType = z.infer<typeof GetMatchQueueParamsSchema>
export type GetMatchQueueDetailResType = z.infer<typeof GetMatchQueueDetailResSchema>

type MatchQueueFieldType = keyof z.infer<typeof MatchQueueSchema>
export const MATCH_QUEUE_FIELDS = Object.keys(
  MatchQueueSchema.shape
) as MatchQueueFieldType[]
