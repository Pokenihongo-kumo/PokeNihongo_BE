import { Prisma } from '@prisma/client'
import { z } from 'zod'

// Building blocks for response (output) schemas: they describe what a
// response already holds, so they carry no input rules (formats, ranges)
// that stored data could break.

/** A Prisma Decimal column (sent as a string) or a number converted from it */
export const decimalOutSchema = z.custom<Prisma.Decimal | number | string>(
  (v) => typeof v === 'number' || typeof v === 'string' || Prisma.Decimal.isDecimal(v)
)

/**
 * A translated text field as the legacy reads return it: the value in the
 * request language, every language as `{ language, value }`, or every
 * language as one `{ vi, en, ... }` record per entry
 */
export const translatedTextOutSchema = z.union([
  z.string(),
  z.array(z.object({ language: z.string(), value: z.string() })),
  z.array(z.record(z.string(), z.string()))
])
