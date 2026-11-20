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

export type MatchQueue = z.infer<typeof MatchQueueSchema>
type MatchQueueFieldType = keyof z.infer<typeof MatchQueueSchema>
