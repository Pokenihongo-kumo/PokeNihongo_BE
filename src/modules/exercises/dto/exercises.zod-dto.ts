import { createZodDto } from 'nestjs-zod'
import {
  CreateExercisesBodyType,
  UpdateExercisesBodyType,
  GetExercisesByIdParamsType,
  GetExercisesListQueryType,
  ExercisesListResSchema
} from '../entities/exercises.entities'

export class CreateExercisesBodyDTO extends createZodDto(CreateExercisesBodyType) {}
export class UpdateExercisesBodyDTO extends createZodDto(UpdateExercisesBodyType) {}
export class GetExercisesByIdParamsDTO extends createZodDto(GetExercisesByIdParamsType) {}
export class GetExercisesListQueryDTO extends createZodDto(GetExercisesListQueryType) {}
export class ExercisesListResDTO extends createZodDto(ExercisesListResSchema) {}
