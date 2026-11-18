import { LessonContentSortField, SortOrder } from '@/common/enum/enum'
import { paginatedResSchema } from '@/shared/utils/pagination'
import { resSchema } from '@/shared/utils/res-schema'
import { LessonContentsType as PrismaLessonContentType } from '@prisma/client'
import { z } from 'zod'

// Lesson Content Entity Types
export const LessonContentSchema = z.object({
  id: z.number(),
  lessonId: z.number(),
  contentId: z.number(),
  contentType: z.nativeEnum(PrismaLessonContentType),
  contentOrder: z.number(),
  createdAt: z.date(),
  updatedAt: z.date()
})

export const LessonContentWithRelationsSchema = LessonContentSchema.extend({
  lesson: z
    .object({
      id: z.number(),
      slug: z.string(),
      titleKey: z.string()
    })
    .optional()
})

// Request/Response Types
export const CreateLessonContentBodySchema = z.object({
  lessonId: z.number(),
  contentId: z.number(),
  contentType: z.nativeEnum(PrismaLessonContentType)
})

export const CreateMutiLessonContentBodySchema = z.object({
  lessonId: z.number(),
  contentId: z.number().array(),
  contentType: z.nativeEnum(PrismaLessonContentType)
})

export const UpdateLessonContentBodySchema = z.object({
  contentType: z.string().min(1).max(50).optional(),
  contentOrder: z.number().min(0).optional()
})

export const UpdateLessonContentOrder = z.object({
  contentType: z.nativeEnum(PrismaLessonContentType),
  lessonContentId: z.number().array()
})

export const GetLessonContentByIdParamsSchema = z.object({
  id: z.string().transform(Number)
})

export const GetLessonContentListQuerySchema = z.object({
  page: z.string().transform(Number).default('1'),
  limit: z.string().transform(Number).default('10'),
  lessonId: z.string().transform(Number).optional(),
  contentType: z.nativeEnum(PrismaLessonContentType).optional(),
  sortBy: z
    .nativeEnum(LessonContentSortField)
    .optional()
    .default(LessonContentSortField.CREATED_AT),
  sort: z.nativeEnum(SortOrder).optional().default(SortOrder.DESC)
})

// Response schemas
export const LessonContentListResSchema = paginatedResSchema(LessonContentSchema).strict()

// Schema for grouped lesson content with translations
export const VocabularyContentSchema = z.object({
  id: z.number(),
  wordJp: z.string(),
  reading: z.string(),
  imageUrl: z.string().nullable().optional(),
  audioUrl: z.string().nullable().optional(),
  meanings: z
    .array(
      z.object({
        meaning: z.union([
          z.string(),
          z.array(
            z.object({
              language: z.string(),
              value: z.string()
            })
          )
        ]),
        exampleSentence: z
          .union([
            z.string(),
            z.array(
              z.object({
                language: z.string(),
                value: z.string()
              })
            )
          ])
          .optional(),
        explanation: z
          .union([
            z.string(),
            z.array(
              z.object({
                language: z.string(),
                value: z.string()
              })
            )
          ])
          .optional()
      })
    )
    .optional(),
  contentOrder: z.number(),
  lessonContentId: z.number()
})

export const GrammarContentSchema = z.object({
  id: z.number(),
  titleKey: z.string(),
  title: z
    .union([
      z.string(),
      z.array(
        z.object({
          language: z.string(),
          value: z.string()
        })
      )
    ])
    .optional(),
  descriptionKey: z.string().optional(),
  description: z
    .union([
      z.string(),
      z.array(
        z.object({
          language: z.string(),
          value: z.string()
        })
      )
    ])
    .optional(),
  usageKey: z.string().optional(),
  usage: z
    .union([
      z.string(),
      z.array(
        z.object({
          language: z.string(),
          value: z.string()
        })
      )
    ])
    .optional(),
  contentOrder: z.number(),
  lessonContentId: z.number()
})

export const KanjiContentSchema = z.object({
  id: z.number(),
  character: z.string(),
  meaning: z
    .union([
      z.string(),
      z.array(
        z.object({
          language: z.string(),
          value: z.string()
        })
      )
    ])
    .optional(),
  explanationMeaning: z.string().optional(),
  onReading: z.string().optional(),
  kunReading: z.string().optional(),
  strokeCount: z.number().optional(),
  imageUrl: z.string().nullable().optional(),
  contentOrder: z.number(),
  lessonContentId: z.number()
})

export const GroupedLessonContentSchema = z.object({
  voca: z.array(VocabularyContentSchema).optional(),
  grama: z.array(GrammarContentSchema).optional(),
  kanji: z.array(KanjiContentSchema).optional(),
  testId: z.number().nullable().optional(),
  checkLastTest: z.boolean().optional()
})

export const LessonContentFullResSchema = resSchema(GroupedLessonContentSchema).strict()

// Type exports
export type LessonContentType = z.infer<typeof LessonContentSchema>
export type LessonContentWithRelationsType = z.infer<
  typeof LessonContentWithRelationsSchema
>
export type CreateLessonContentBodyType = z.infer<typeof CreateLessonContentBodySchema>
export type CreateMutiLessonContentBodyType = z.infer<
  typeof CreateMutiLessonContentBodySchema
>
export type UpdateLessonContentBodyType = z.infer<typeof UpdateLessonContentBodySchema>
export type UpdateLessonContentOrder = z.infer<typeof UpdateLessonContentOrder>
export type GetLessonContentByIdParamsType = z.infer<
  typeof GetLessonContentByIdParamsSchema
>
export type GetLessonContentListQueryType = z.infer<
  typeof GetLessonContentListQuerySchema
>
export type LessonContentListResType = z.infer<typeof LessonContentListResSchema>

// New types for grouped content
export type VocabularyContentType = z.infer<typeof VocabularyContentSchema>
export type GrammarContentType = z.infer<typeof GrammarContentSchema>
export type KanjiContentType = z.infer<typeof KanjiContentSchema>
export type GroupedLessonContentType = z.infer<typeof GroupedLessonContentSchema>
export type LessonContentFullResType = z.infer<typeof LessonContentFullResSchema>
