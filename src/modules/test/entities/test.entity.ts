import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { TestStatus as PrismaTestStatus, TestSetStatus } from '@prisma/client'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'

extendZodWithOpenApi(z)
patchNestJsSwagger()

// Test Schema
export const TestSchema = z.object({
  id: z.number(),
  name: z.union([
    z.string(),
    z.array(
      z.object({
        language: z.string(),
        value: z.string()
      })
    )
  ]),
  description: z
    .union([
      z.string().nullable(),
      z.array(
        z.object({
          language: z.string(),
          value: z.string()
        })
      )
    ])
    .optional(),
  price: z.number().nullable().optional(),
  levelN: z.number().int().min(0).max(5).nullable().optional(),
  limit: z.number().int().min(0).nullable().optional(),
  testType: z.nativeEnum(PrismaTestStatus),
  status: z.nativeEnum(TestSetStatus),
  creatorId: z.number().nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date()
})

// Types
export type Test = z.infer<typeof TestSchema>
