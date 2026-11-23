import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import { LessonContentWithRelationsSchema } from '../entities/lesson-content.entity'

export const LessonContentListResponseSchema = z.object({
  data: z.array(LessonContentWithRelationsSchema),
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  totalPages: z.number(),
  message: z.string()
})

export type LessonContentListResponse = z.infer<typeof LessonContentListResponseSchema>

export class LessonContentListResponseDTO extends createZodDto(
  LessonContentListResponseSchema
) {}
