import { createZodDto } from 'nestjs-zod'
import {
  CreateTypeEffectivenessBodySchema,
  CreateTypeEffectivenessResSchema,
  GetTypeEffectivenessDetailResSchema,
  GetTypeEffectivenessParamsSchema,
  UpdateTypeEffectivenessBodySchema,
  UpdateTypeEffectivenessResSchema
} from '../entities/type-effectiveness.entity'

export class CreateTypeEffectivenessBodyDTO extends createZodDto(
  CreateTypeEffectivenessBodySchema
) {}

export class CreateTypeEffectivenessResDTO extends createZodDto(
  CreateTypeEffectivenessResSchema
) {}

export class UpdateTypeEffectivenessBodyDTO extends createZodDto(
  UpdateTypeEffectivenessBodySchema
) {}

export class UpdateTypeEffectivenessResDTO extends createZodDto(
  UpdateTypeEffectivenessResSchema
) {}
export class GetTypeEffectivenessParamsDTO extends createZodDto(
  GetTypeEffectivenessParamsSchema
) {}

export class GetTypeEffectivenessDetailResDTO extends createZodDto(
  GetTypeEffectivenessDetailResSchema
) {}
