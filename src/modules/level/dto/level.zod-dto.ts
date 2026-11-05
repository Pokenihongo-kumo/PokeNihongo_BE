import { createZodDto } from 'nestjs-zod'
import {
  CreateLevelBodySchema,
  CreateLevelResSchema,
  GetLevelDetailResSchema,
  GetLevelParamsSchema,
  UpdateLevelBodySchema,
  UpdateLevelResSchema
} from '../entities/level.entity'

export class CreateLevelBodyDTO extends createZodDto(CreateLevelBodySchema) {}

export class CreateLevelResDTO extends createZodDto(CreateLevelResSchema) {}

export class UpdateLevelBodyDTO extends createZodDto(UpdateLevelBodySchema) {}

export class UpdateLevelResDTO extends createZodDto(UpdateLevelResSchema) {}

export class GetLevelParamsDTO extends createZodDto(GetLevelParamsSchema) {}

export class GetLevelDetailResDTO extends createZodDto(GetLevelDetailResSchema) {}
