import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { UserTestStatus } from '@prisma/client'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'

extendZodWithOpenApi(z)
patchNestJsSwagger()

// UserTestStatus enum schema
export const UserTestStatusSchema = z.nativeEnum(UserTestStatus)

// TestInfo schema (simplified Test without timestamps, creatorId)
export const TestInfoSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable().optional(),
  price: z.number().nullable().optional(),
  levelN: z.number().int().min(0).max(5).nullable().optional(),
  testType: z.string(),
  status: z.string(),
  limit: z.number().int().min(0).nullable().optional()
})

// UserTest schema
export const UserTestSchema = z.object({
  id: z.number(),
  userId: z.number(),
  testId: z.number(),
  status: UserTestStatusSchema,
  limit: z.number().int().min(0).nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date()
})

// UserTestWithTest schema (for my endpoint response)
export const UserTestWithTestSchema = z.object({
  id: z.number(),
  userId: z.number(),
  status: UserTestStatusSchema,
  limit: z.number().int().min(0).nullable().optional(),
  test: TestInfoSchema
})

// Types
export type UserTest = z.infer<typeof UserTestSchema>
export type TestInfo = z.infer<typeof TestInfoSchema>
export type UserTestWithTest = z.infer<typeof UserTestWithTestSchema>
