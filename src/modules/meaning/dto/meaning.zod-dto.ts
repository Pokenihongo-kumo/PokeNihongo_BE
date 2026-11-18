import { checkIdSchema } from '@/common/utils/id.validation'
import { MeaningMessage } from '@/i18n/message-keys'
import { paginatedResSchema } from '@/shared/utils/pagination'
import { resSchema } from '@/shared/utils/res-schema'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import { MeaningSchema } from '../entities/meaning.entity'

// Translation keys follow module.id.field, e.g. meaning.example.definition
const isValidTranslationKey = (key: string): boolean =>
  /^[a-zA-Z][a-zA-Z0-9]*(\.[a-zA-Z][a-zA-Z0-9]*)*$/.test(key)

// Contains Hiragana, Katakana or Kanji (or basic punctuation)
export const isValidJapaneseText = (text: string): boolean =>
  /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u3400-\u4DBF\u20000-\u2A6DF\u2A700-\u2B73F\u2B740-\u2B81F\u2B820-\u2CEAF\uF900-\uFAFF\u2F800-\u2FA1F\s\-.,!?'"]/.test(
    text
  )

export const translationKey = (required: string, tooLong: string) =>
  z
    .string()
    .min(1, required)
    .max(500, tooLong)
    .refine(isValidTranslationKey, { message: MeaningMessage.TRANSLATION_KEY_FORMAT })

export const vocabularyId = z.number().min(1, MeaningMessage.VOCABULARY_ID_INVALID)

export const wordTypeId = z.number().min(1, MeaningMessage.WORD_TYPE_ID_INVALID)

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

export type CreateMeaningBody = z.infer<typeof CreateMeaningSchema>

export class CreateMeaningBodyDTO extends createZodDto(CreateMeaningSchema) {}

// Service input: the body plus the keys the service generates

export const CreateMeaningServiceSchema = CreateMeaningSchema.extend({
  meaningKey: z.string().optional(),
  exampleSentenceKey: z.string().optional(),
  explanationKey: z.string().optional()
})

export type CreateMeaningService = z.infer<typeof CreateMeaningServiceSchema>

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

export type UpdateMeaningBody = z.infer<typeof UpdateMeaningSchema>

export class UpdateMeaningBodyDTO extends createZodDto(UpdateMeaningSchema) {}

export const GetMeaningByIdParamsSchema = z.object({
  id: checkIdSchema(MeaningMessage.INVALID_ID)
})

export type GetMeaningByIdParams = z.infer<typeof GetMeaningByIdParamsSchema>

export class GetMeaningByIdParamsDTO extends createZodDto(GetMeaningByIdParamsSchema) {}

export const GetMeaningsByVocabularyParamsSchema = z.object({
  vocabularyId: checkIdSchema(MeaningMessage.VOCABULARY_ID_INVALID)
})

export type GetMeaningsByVocabularyParams = z.infer<
  typeof GetMeaningsByVocabularyParamsSchema
>

export class GetMeaningsByVocabularyParamsDTO extends createZodDto(
  GetMeaningsByVocabularyParamsSchema
) {}

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

export type GetMeaningListQuery = z.infer<typeof GetMeaningListQuerySchema>

export class GetMeaningListQueryDTO extends createZodDto(GetMeaningListQuerySchema) {}

// Response envelopes: statusCode is part of them, else the serializer drops it

export const MeaningResSchema = resSchema(MeaningSchema)

export class MeaningResDTO extends createZodDto(MeaningResSchema) {}

export const MeaningListResSchema = paginatedResSchema(MeaningSchema)

export class MeaningListResDTO extends createZodDto(MeaningListResSchema) {}
