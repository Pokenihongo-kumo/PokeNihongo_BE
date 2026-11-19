import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { TestSetType as PrismaTestSetType, TestSetStatus } from '@prisma/client'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'

extendZodWithOpenApi(z)
patchNestJsSwagger()

// TestSet Schema
export const TestSetSchema = z.object({
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
  content: z.string().nullable().optional(),
  audioUrl: z.string().nullable().optional(),
  price: z.number().nullable().optional(),
  levelN: z.number().nullable().optional(),
  testType: z.nativeEnum(PrismaTestSetType),
  status: z.nativeEnum(TestSetStatus),
  creatorId: z.number().nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date()
})

// Types
export type TestSet = z.infer<typeof TestSetSchema>
