import { z } from 'zod'

// Lesson Category Entity Types
export const LessonCategorySchema = z.object({
  id: z.number(),
  nameKey: z.string(),
  slug: z.string(),
  createdAt: z.date(),
  updatedAt: z.date()
})

// What reads return: the name translated for the request language
export const LessonCategoryWithRelationsSchema = z.object({
  id: z.number(),
  slug: z.string(),
  name: z.string(), // Translated name
  createdAt: z.date(),
  updatedAt: z.date()
})

// Type exports
export type LessonCategory = z.infer<typeof LessonCategorySchema>
export type LessonCategoryWithRelations = z.infer<
  typeof LessonCategoryWithRelationsSchema
>
