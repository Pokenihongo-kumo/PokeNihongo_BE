import { createZodDto } from 'nestjs-zod'
import {
  CreateExercisesBodySchema,
  GetExercisesByIdParamsSchema,
  GetExercisesByLessonParamsSchema,
  GetExercisesListQuerySchema,
  UpdateExercisesBodySchema
} from '../entities/exercises.entity'

export class CreateExercisesBodyDTO extends createZodDto(CreateExercisesBodySchema) {}
export class UpdateExercisesBodyDTO extends createZodDto(UpdateExercisesBodySchema) {}
export class GetExercisesByIdParamsDTO extends createZodDto(
  GetExercisesByIdParamsSchema
) {}
export class GetExercisesByLessonParamsDTO extends createZodDto(
  GetExercisesByLessonParamsSchema
) {}
export class GetExercisesListQueryDTO extends createZodDto(GetExercisesListQuerySchema) {}
