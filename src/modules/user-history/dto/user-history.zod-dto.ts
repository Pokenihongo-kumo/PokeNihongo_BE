import { createZodDto } from 'nestjs-zod'
import {
  GetHistoryListQuerySchema,
  GetAdminHistoryListQuerySchema,
  HistoryListResSchema,
  AdminHistoryListResSchema,
  GetRecentExercisesQuerySchema,
  RecentExercisesResSchema,
  HistoryExerciseItemSchema,
  HistoryExercisesResSchema,
  HistoryTestsResSchema
} from '../entities/user-history.entity'

export class GetHistoryListQueryDTO extends createZodDto(GetHistoryListQuerySchema) {}
export class GetAdminHistoryListQueryDTO extends createZodDto(
  GetAdminHistoryListQuerySchema
) {}
export class HistoryListResDTO extends createZodDto(HistoryListResSchema) {}
export class AdminHistoryListResDTO extends createZodDto(AdminHistoryListResSchema) {}
export class GetRecentExercisesQueryDTO extends createZodDto(
  GetRecentExercisesQuerySchema
) {}
export class RecentExercisesResDTO extends createZodDto(RecentExercisesResSchema) {}
export class HistoryExercisesResDTO extends createZodDto(HistoryExercisesResSchema) {}
export class HistoryTestsResDTO extends createZodDto(HistoryTestsResSchema) {}
