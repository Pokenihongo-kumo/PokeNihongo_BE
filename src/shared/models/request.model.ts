import { z } from 'zod'

export const PaginationQuerySchema = z.object({
  currentPage: z.coerce.number().int().positive().default(1), // Phải thêm coerce để chuyển từ string sang number
  pageSize: z.coerce.number().int().positive().default(15), // Phải thêm coerce để chuyển từ string sang number
  qs: z.string().optional()
})

export type PaginationQuery = z.infer<typeof PaginationQuerySchema>
