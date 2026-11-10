import { checkIdSchema } from '@/common/utils/id.validation'
import { MeaningMessage } from '@/i18n/message-keys'
import { paginatedResSchema } from '@/shared/utils/pagination'
import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'

extendZodWithOpenApi(z)
patchNestJsSwagger()

// Translation keys follow module.id.field, e.g. meaning.example.definition
const isValidTranslationKey = (key: string): boolean =>
  /^[a-zA-Z][a-zA-Z0-9]*(\.[a-zA-Z][a-zA-Z0-9]*)*$/.test(key)

// Contains Hiragana, Katakana or Kanji (or basic punctuation)
const isValidJapaneseText = (text: string): boolean =>
  /[぀-ゟ゠-ヿ一-龯㐀-䶿 0-⩭F⩰0-⭳F⭴0-⮁F⮂0-⳪F豈-﫿⾀0-⾡F\s\-.,!?'"]/.test(text)

const translationKey = (required: string, tooLong: string) =>
  z
    .string()
    .min(1, required)
    .max(500, tooLong)
    .refine(isValidTranslationKey, { message: MeaningMessage.TRANSLATION_KEY_FORMAT })

const vocabularyId = z.number().min(1, MeaningMessage.VOCABULARY_ID_INVALID)
const wordTypeId = z.number().min(1, MeaningMessage.WORD_TYPE_ID_INVALID)

export const MeaningSchema = z.object({
  id: z.number(),
  vocabularyId: z.number(),
  wordTypeId: z.number().nullable().optional(),
  meaningKey: z.string().nullable().optional(),
  exampleSentenceKey: z.string().nullable().optional(),
  explanationKey: z.string().nullable().optional(),
  exampleSentenceJp: z.string().nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date()
})

export const CreateMeaningSchema = z.object({
  vocabularyId,
  wordTypeId: wordTypeId.optional(),
  exampleSentenceJp: z
    .string()
    .max(1000, MeaningMessage.EXAMPLE_JP_TOO_LONG)
    .refine((val) => !val || isValidJapaneseText(val), {
      message: MeaningMessage.EXAMPLE_JP_NOT_JAPANESE
    })
    .optional()
})

// Service input: the body plus the keys the service generates
export const CreateMeaningServiceSchema = CreateMeaningSchema.extend({
  meaningKey: z.string().optional(),
  exampleSentenceKey: z.string().optional(),
  explanationKey: z.string().optional()
})

export const UpdateMeaningSchema = z.object({
  vocabularyId: vocabularyId.optional(),
  wordTypeId: wordTypeId.optional(),
  meaningKey: translationKey(
    MeaningMessage.MEANING_KEY_REQUIRED,
    MeaningMessage.MEANING_KEY_TOO_LONG
  ).optional(),
  exampleSentenceKey: translationKey(
    MeaningMessage.EXAMPLE_KEY_REQUIRED,
    MeaningMessage.EXAMPLE_KEY_TOO_LONG
  ).optional(),
  explanationKey: translationKey(
    MeaningMessage.EXPLANATION_KEY_REQUIRED,
    MeaningMessage.EXPLANATION_KEY_TOO_LONG
  ).optional(),
  exampleSentenceJp: z
    .string()
    .min(1, MeaningMessage.EXAMPLE_JP_REQUIRED)
    .max(1000, MeaningMessage.EXAMPLE_JP_TOO_LONG)
    .refine(isValidJapaneseText, { message: MeaningMessage.EXAMPLE_JP_NOT_JAPANESE })
    .optional()
})

export const GetMeaningByIdParamsSchema = z.object({
  id: checkIdSchema(MeaningMessage.INVALID_ID)
})

export const GetMeaningsByVocabularyParamsSchema = z.object({
  vocabularyId: checkIdSchema(MeaningMessage.VOCABULARY_ID_INVALID)
})

export const GetMeaningListQuerySchema = z.object({
  page: z
    .string()
    .transform((val) => parseInt(val, 10))
    .default('1'),
  limit: z
    .string()
    .transform((val) => parseInt(val, 10))
    .default('10'),
  search: z.string().optional(),
  vocabularyId: z
    .string()
    .transform((val) => parseInt(val, 10))
    .optional(),
  wordTypeId: z
    .string()
    .transform((val) => parseInt(val, 10))
    .optional()
})

// Response envelopes: statusCode is part of them, else the serializer drops it
export const MeaningResSchema = z.object({
  statusCode: z.number(),
  data: MeaningSchema,
  message: z.string()
})

export const MeaningListResSchema = paginatedResSchema(MeaningSchema)

// The detail route adds the translations of meaningKey and exampleSentenceKey
const TranslationItemSchema = z.object({ language_code: z.string(), value: z.string() })
export const MeaningWithTranslationsSchema = MeaningSchema.extend({
  meaningTranslations: z.array(TranslationItemSchema),
  exampleTranslations: z.array(TranslationItemSchema)
})

export type MeaningType = z.infer<typeof MeaningSchema>
export type MeaningWithTranslationsType = z.infer<typeof MeaningWithTranslationsSchema>
export type CreateMeaningBodyType = z.infer<typeof CreateMeaningSchema>
export type CreateMeaningServiceType = z.infer<typeof CreateMeaningServiceSchema>
export type UpdateMeaningBodyType = z.infer<typeof UpdateMeaningSchema>
export type GetMeaningByIdParamsType = z.infer<typeof GetMeaningByIdParamsSchema>
export type GetMeaningListQueryType = z.infer<typeof GetMeaningListQuerySchema>
export type GetMeaningsByVocabularyParamsType = z.infer<
  typeof GetMeaningsByVocabularyParamsSchema
>
