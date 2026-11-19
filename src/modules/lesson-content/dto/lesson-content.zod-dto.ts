import { LessonContentSortField, SortOrder } from '@/common/enum/enum'
import { paginatedResSchema } from '@/shared/utils/pagination'
import { resSchema } from '@/shared/utils/res-schema'
import { LessonContentsType as PrismaLessonContentType } from '@prisma/client'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import {
  GroupedLessonContentSchema,
  LessonContentSchema,
  UpdateLessonContentOrder
} from '../entities/lesson-content.entities'

export class updateLessonContentOrder extends createZodDto(UpdateLessonContentOrder) {}

// Request/Response Types

export const CreateLessonContentBodySchema = z.object({
  lessonId: z.number(),
  contentId: z.number(),
  contentType: z.nativeEnum(PrismaLessonContentType)
})

export type CreateLessonContentBody = z.infer<typeof CreateLessonContentBodySchema>

// Lesson Content DTOs
export class CreateLessonContentBodyDTO extends createZodDto(
  CreateLessonContentBodySchema
) {}

export const CreateMutiLessonContentBodySchema = z.object({
  lessonId: z.number(),
  contentId: z.number().array(),
  contentType: z.nativeEnum(PrismaLessonContentType)
})

export type CreateMutiLessonContentBody = z.infer<
  typeof CreateMutiLessonContentBodySchema
>

export const UpdateLessonContentBodySchema = z.object({
  contentType: z.string().min(1).max(50).optional(),
  contentOrder: z.number().min(0).optional()
})

export type UpdateLessonContentBody = z.infer<typeof UpdateLessonContentBodySchema>

export class UpdateLessonContentBodyDTO extends createZodDto(
  UpdateLessonContentBodySchema
) {}

export const GetLessonContentByIdParamsSchema = z.object({
  id: z.string().transform(Number)
})

export type GetLessonContentByIdParams = z.infer<typeof GetLessonContentByIdParamsSchema>

export class GetLessonContentByIdParamsDTO extends createZodDto(
  GetLessonContentByIdParamsSchema
) {}

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

export type GetLessonContentListQuery = z.infer<typeof GetLessonContentListQuerySchema>

export class GetLessonContentListQueryDTO extends createZodDto(
  GetLessonContentListQuerySchema
) {}

// Response schemas

export const LessonContentListResSchema = paginatedResSchema(LessonContentSchema).strict()

export type LessonContentListRes = z.infer<typeof LessonContentListResSchema>

export class LessonContentListResDTO extends createZodDto(LessonContentListResSchema) {}

export const LessonContentFullResSchema = resSchema(GroupedLessonContentSchema).strict()

export type LessonContentFullRes = z.infer<typeof LessonContentFullResSchema>

export class LessonContentFullResDTO extends createZodDto(LessonContentFullResSchema) {}
