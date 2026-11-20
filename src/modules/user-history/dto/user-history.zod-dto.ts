import { checkIdSchema } from '@/common/utils/id.validation'
import { UserHistoryMessage } from '@/i18n/message-keys'
import { paginatedResSchema } from '@/shared/utils/pagination'
import { resSchema } from '@/shared/utils/res-schema'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import {
  AdminHistoryItemSchema,
  HistoryExerciseItemSchema,
  HistoryItemSchema,
  HistoryTestItemSchema,
  HistoryTypeSchema,
  RecentExerciseItemSchema
} from '../entities/user-history.entity'

// History List Response Schema

export const HistoryListResSchema = paginatedResSchema(HistoryItemSchema).strict()

export class HistoryListResDTO extends createZodDto(HistoryListResSchema) {}

// Admin History List Response Schema (có thể có user info)

export const AdminHistoryListResSchema =
  paginatedResSchema(AdminHistoryItemSchema).strict()

export class AdminHistoryListResDTO extends createZodDto(AdminHistoryListResSchema) {}

// History List Query Schema

export const GetHistoryListQuerySchema = z
  .object({
    // A non-number reached Prisma as NaN (500); 0 or less gave an empty page
    currentPage: checkIdSchema(UserHistoryMessage.INVALID_PAGE).default(1),
    pageSize: checkIdSchema(UserHistoryMessage.INVALID_PAGE_SIZE).default(10),
    type: HistoryTypeSchema.optional(),
    status: z.string().optional()
  })
  .strict()

export type GetHistoryListQuery = z.infer<typeof GetHistoryListQuerySchema>

export class GetHistoryListQueryDTO extends createZodDto(GetHistoryListQuerySchema) {}

// Admin History List Query Schema (có thêm userId để filter)

export const GetAdminHistoryListQuerySchema = z
  .object({
    // A non-number reached Prisma as NaN (500); 0 or less gave an empty page
    currentPage: checkIdSchema(UserHistoryMessage.INVALID_PAGE).default(1),
    pageSize: checkIdSchema(UserHistoryMessage.INVALID_PAGE_SIZE).default(10),
    type: HistoryTypeSchema.optional(),
    status: z.string().optional(),
    userId: checkIdSchema(UserHistoryMessage.INVALID_USER_ID).optional() // Admin có thể filter theo userId
  })
  .strict()

export type GetAdminHistoryListQuery = z.infer<typeof GetAdminHistoryListQuerySchema>

export class GetAdminHistoryListQueryDTO extends createZodDto(
  GetAdminHistoryListQuerySchema
) {}

export const HistoryExercisesResSchema = resSchema(
  z.object({
    results: z.array(HistoryExerciseItemSchema),
    allTime: z.number(), // Tổng thời gian của tất cả attempts (giây)
    allAttempts: z.number(),
    completedAttempts: z.number(),
    failedAttempts: z.number(),
    skippedAttempts: z.number(),
    abandonedAttempts: z.number(),
    pagination: z.object({
      current: z.number(),
      pageSize: z.number(),
      totalPage: z.number(),
      totalItem: z.number()
    })
  })
).strict()

export class HistoryExercisesResDTO extends createZodDto(HistoryExercisesResSchema) {}

export const HistoryTestsResSchema = resSchema(
  z.object({
    results: z.array(HistoryTestItemSchema),
    allTime: z.number(), // Tổng thời gian của tất cả attempts (giây)
    allAttempts: z.number(),
    completedAttempts: z.number(),
    failedAttempts: z.number(),
    skippedAttempts: z.number(),
    abandonedAttempts: z.number(),
    pagination: z.object({
      current: z.number(),
      pageSize: z.number(),
      totalPage: z.number(),
      totalItem: z.number()
    })
  })
).strict()

export class HistoryTestsResDTO extends createZodDto(HistoryTestsResSchema) {}

// Recent Exercises Query Schema

export const GetRecentExercisesQuerySchema = z
  .object({
    // A non-number reached Prisma as NaN (500); 0 or less gave an empty page
    currentPage: checkIdSchema(UserHistoryMessage.INVALID_PAGE).default(1),
    pageSize: checkIdSchema(UserHistoryMessage.INVALID_PAGE_SIZE).default(10),
    status: z
      .enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'ABANDONED', 'SKIPPED'])
      .optional()
  })
  .strict()

export type GetRecentExercisesQuery = z.infer<typeof GetRecentExercisesQuerySchema>

export class GetRecentExercisesQueryDTO extends createZodDto(
  GetRecentExercisesQuerySchema
) {}

// Recent Exercises Response Schema

export const RecentExercisesResSchema = paginatedResSchema(
  RecentExerciseItemSchema
).strict()

export class RecentExercisesResDTO extends createZodDto(RecentExercisesResSchema) {}
