import { checkIdSchema } from '@/common/utils/id.validation'
import { UserProgressMessage } from '@/i18n/message-keys'
import { paginatedResSchema } from '@/shared/utils/pagination'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import {
  ProgressStatusSchema,
  UserProgressWithRelationsSchema
} from '../entities/user-progress.entity'

// Create UserProgress schema

export const CreateUserProgressBodySchema = z
  .object({
    userId: z.number(),
    lessonId: z.number(),
    status: ProgressStatusSchema.optional().default('NOT_STARTED'),
    progressPercentage: z.number().min(0).max(100).optional().default(0)
  })
  .strict()

export type CreateUserProgressBody = z.infer<typeof CreateUserProgressBodySchema>

export class CreateUserProgressBodyDTO extends createZodDto(
  CreateUserProgressBodySchema
) {}

// Update UserProgress schema

export const UpdateUserProgressBodySchema = z
  .object({
    status: ProgressStatusSchema.optional(),
    progressPercentage: z.number().min(0).max(100).optional()
  })
  .strict()

export type UpdateUserProgressBody = z.infer<typeof UpdateUserProgressBodySchema>

export class UpdateUserProgressBodyDTO extends createZodDto(
  UpdateUserProgressBodySchema
) {}

// Response schemas

export const UserProgressResSchema = z
  .object({
    data: UserProgressWithRelationsSchema,
    message: z.string()
  })
  .strict()

export type UserProgressRes = z.infer<typeof UserProgressResSchema>

export class UserProgressResDTO extends createZodDto(UserProgressResSchema) {}

export const UserProgressListResSchema = paginatedResSchema(
  UserProgressWithRelationsSchema
).strict()

export type UserProgressListRes = z.infer<typeof UserProgressListResSchema>

export class UserProgressListResDTO extends createZodDto(UserProgressListResSchema) {}

// Params and Query schemas

export const GetUserProgressByIdParamsSchema = z
  .object({
    id: checkIdSchema(UserProgressMessage.INVALID_ID)
  })
  .strict()

export type GetUserProgressByIdParams = z.infer<typeof GetUserProgressByIdParamsSchema>

export class GetUserProgressByIdParamsDTO extends createZodDto(
  GetUserProgressByIdParamsSchema
) {}

export const UserProgressLessonParamsSchema = z
  .object({
    lessonId: checkIdSchema(UserProgressMessage.INVALID_LESSON_ID)
  })
  .strict()

export type UserProgressLessonParams = z.infer<typeof UserProgressLessonParamsSchema>

export class UserProgressLessonParamsDTO extends createZodDto(
  UserProgressLessonParamsSchema
) {}

export const UserProgressUserParamsSchema = z
  .object({
    userId: checkIdSchema(UserProgressMessage.INVALID_USER_ID)
  })
  .strict()

export type UserProgressUserParams = z.infer<typeof UserProgressUserParamsSchema>

export class UserProgressUserParamsDTO extends createZodDto(
  UserProgressUserParamsSchema
) {}

// A non-number used to reach Prisma as NaN (500), or turn a filter off

export const GetUserProgressListQuerySchema = z
  .object({
    currentPage: checkIdSchema(UserProgressMessage.INVALID_PAGE).default(1),
    pageSize: checkIdSchema(UserProgressMessage.INVALID_PAGE_SIZE).default(10),
    userId: checkIdSchema(UserProgressMessage.INVALID_USER_ID).optional(),
    lessonId: checkIdSchema(UserProgressMessage.INVALID_LESSON_ID).optional(),
    lessonCategoryId: checkIdSchema(UserProgressMessage.INVALID_CATEGORY_ID).optional(),
    status: ProgressStatusSchema.optional(),
    progressPercentage: z.coerce
      .number({ invalid_type_error: UserProgressMessage.INVALID_PERCENTAGE })
      .int(UserProgressMessage.INVALID_PERCENTAGE)
      .min(0, UserProgressMessage.INVALID_PERCENTAGE)
      .max(100, UserProgressMessage.INVALID_PERCENTAGE)
      .optional()
  })
  .strict()

export type GetUserProgressListQuery = z.infer<typeof GetUserProgressListQuerySchema>

export class GetUserProgressListQueryDTO extends createZodDto(
  GetUserProgressListQuerySchema
) {}

// Start lesson schema

export const StartLessonBodySchema = z
  .object({
    lessonId: z.number()
  })
  .strict()

export type StartLessonBody = z.infer<typeof StartLessonBodySchema>

export class StartLessonBodyDTO extends createZodDto(StartLessonBodySchema) {}

// Complete lesson schema

export const CompleteLessonBodySchema = z
  .object({
    lessonId: z.number(),
    score: z.number().optional()
  })
  .strict()

export type CompleteLessonBody = z.infer<typeof CompleteLessonBodySchema>

export class CompleteLessonBodyDTO extends createZodDto(CompleteLessonBodySchema) {}
