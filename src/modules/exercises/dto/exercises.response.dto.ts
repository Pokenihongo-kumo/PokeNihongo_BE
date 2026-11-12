import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import { ExercisesType, ExercisesListResSchema } from '../entities/exercises.entity'

// Response DTOs
export const ExercisesResponseSchema = z.object({
  statusCode: z.number(),
  data: ExercisesType,
  message: z.string()
})

// Use the schema from entities that matches vocabulary/lesson pattern
export const ExercisesListResponseSchema = ExercisesListResSchema

export class ExercisesResponseDTO extends createZodDto(ExercisesResponseSchema) {}
export class ExercisesListResponseDTO extends createZodDto(ExercisesListResponseSchema) {}
