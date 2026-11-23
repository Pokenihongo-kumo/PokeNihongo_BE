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

export const UpdateLessonContentOrder = z.object({
  contentType: z.nativeEnum(PrismaLessonContentType),
  lessonContentId: z.number().array()
})

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
export type UpdateLessonContentOrder = z.infer<typeof UpdateLessonContentOrder>
export type GroupedLessonContent = z.infer<typeof GroupedLessonContentSchema>
