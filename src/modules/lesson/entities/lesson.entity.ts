import { z } from 'zod'

// Lesson Entity Types
export const LessonSchema = z.object({
  id: z.number(),
  slug: z.string(),
  titleJp: z.string(),
  titleKey: z.string(),
  // One string with ?lang, else every translation [{ language: code, value }]
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
  levelJlpt: z.number().nullable(),
  estimatedTimeMinutes: z.number(),
  lessonOrder: z.number(),
  isPublished: z.boolean(),
  publishedAt: z.date().nullable(),
  version: z.string(),
  lessonCategoryId: z.number(),
  rewardId: z.array(z.number()).optional().default([]),
  testId: z.number().nullable().optional(),
  createdById: z.number(),
  createdAt: z.date(),
  updatedAt: z.date()
})

export const LessonWithRelationsSchema = LessonSchema.extend({
  lessonCategory: z
    .object({
      id: z.number(),
      nameKey: z.string(),
      slug: z.string()
    })
    .optional(),
  createdBy: z
    .object({
      id: z.number(),
      name: z.string(),
      email: z.string()
    })
    .optional()
})
