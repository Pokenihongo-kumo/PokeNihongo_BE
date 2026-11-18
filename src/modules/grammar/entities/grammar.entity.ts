import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'

extendZodWithOpenApi(z)
patchNestJsSwagger()

// Grammar Entity Types
export const GrammarSchema = z.object({
  id: z.number(),
  structure: z.string(),
  level: z.string(),
  createdAt: z.date(),
  updatedAt: z.date()
})

// Type exports
export type Grammar = z.infer<typeof GrammarSchema>
