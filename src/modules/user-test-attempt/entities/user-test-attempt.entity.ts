import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { TestAttemptStatus as PrismaTestAttemptStatus } from '@prisma/client'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'

extendZodWithOpenApi(z)
patchNestJsSwagger()

// TestAttemptStatus enum
export const TestAttemptStatusSchema = z.nativeEnum(PrismaTestAttemptStatus)
// UserTestAttempt schema
export const UserTestAttemptSchema = z.object({
  id: z.number(),
  userId: z.number(),
  testId: z.number(),
  status: TestAttemptStatusSchema,
  time: z.number().optional().nullable(),
  score: z.number().optional().nullable(),
  createdAt: z.date(),
  updatedAt: z.date()
})

// Types
export type TestAttemptStatus = z.infer<typeof TestAttemptStatusSchema>
export type UserTestAttempt = z.infer<typeof UserTestAttemptSchema>
