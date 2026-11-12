import { createZodDto } from 'nestjs-zod'
import {
  CreateExercisesBodyType,
  UpdateExercisesBodyType,
  GetExercisesByIdParamsType,
  GetExercisesByLessonParamsType,
  GetExercisesListQueryType
} from '../entities/exercises.entity'

export class CreateExercisesBodyDTO extends createZodDto(CreateExercisesBodyType) {}
export class UpdateExercisesBodyDTO extends createZodDto(UpdateExercisesBodyType) {}
export class GetExercisesByIdParamsDTO extends createZodDto(GetExercisesByIdParamsType) {}
export class GetExercisesByLessonParamsDTO extends createZodDto(
  GetExercisesByLessonParamsType
) {}
export class GetExercisesListQueryDTO extends createZodDto(GetExercisesListQueryType) {}
