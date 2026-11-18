import { z } from 'zod'

/** { statusCode, message, data: T }: the envelope every response DTO wraps its data in */
export function resSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    statusCode: z.number(),
    message: z.string(),
    data: dataSchema
  })
}
