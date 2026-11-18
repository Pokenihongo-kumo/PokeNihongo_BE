import { KanjiReadingMessage } from '@/i18n/message-keys'
import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'

extendZodWithOpenApi(z)
patchNestJsSwagger()

// Onyomi/Kunyomi: Hiragana, Katakana and basic punctuation only
const isOnyomiKunyomi = (text: string): boolean =>
  /^[\u3040-\u309F\u30A0-\u30FF\s\-.,!?'"]+$/.test(text)

const READING_TYPES = ['onyomi', 'kunyomi', 'nanori', 'irregular']
const isValidReadingType = (readingType: string): boolean =>
  READING_TYPES.includes(readingType.toLowerCase())

export const readingType = z
  .string()
  .min(1, KanjiReadingMessage.READING_TYPE_REQUIRED)
  .max(20, KanjiReadingMessage.READING_TYPE_TOO_LONG)
  .refine(isValidReadingType, { message: KanjiReadingMessage.READING_TYPE_INVALID })
export const reading = z
  .string()
  .min(1, KanjiReadingMessage.READING_REQUIRED)
  .max(100, KanjiReadingMessage.READING_TOO_LONG)
  .refine(isOnyomiKunyomi, { message: KanjiReadingMessage.READING_NOT_KANA })

// Also validates the readings in kanji's update body
export const KanjiReadingSchema = z.object({
  id: z.number(),
  kanjiId: z.number(),
  readingType,
  reading,
  createdAt: z.date(),
  updatedAt: z.date()
})

// Responses: stored rows, no input rules (a stored reading the rules reject
// must not turn the answer into a 500)
export const KanjiReadingResItemSchema = z.object({
  id: z.number(),
  kanjiId: z.number(),
  readingType: z.string(),
  reading: z.string(),
  createdAt: z.date(),
  updatedAt: z.date()
})

export type KanjiReading = z.infer<typeof KanjiReadingResItemSchema>
