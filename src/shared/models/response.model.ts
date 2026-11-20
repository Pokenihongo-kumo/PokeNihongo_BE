import { resSchema } from '@/shared/utils/res-schema'
import { z } from 'zod'

export const MessageResSchema = resSchema(z.any().optional().nullable())

export const PaginationMetaSchema = z.object({
  current: z.number(),
  pageSize: z.number(),
  totalPage: z.number(),
  totalItem: z.number()
})

export const PaginationDataSchema = z.object({
  results: z.array(z.any()),
  pagination: PaginationMetaSchema
})

export const PaginationResponseSchema = z.object({
  statusCode: z.number().default(200),
  message: z.string(),
  data: PaginationDataSchema
})
export type PaginationMeta = z.infer<typeof PaginationMetaSchema>
export type PaginationResponseType<T = any> = {
  results: T[]
  pagination: PaginationMeta
}
