import { checkIdSchema } from '@/common/utils/id.validation'
import { LevelMessage } from '@/i18n/message-keys'
import { resSchema } from '@/shared/utils/res-schema'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import { LevelSchema, LevelWithRelationsSchema } from '../entities/level.entity'

// HTTP contract of /level: request and response schemas, their types and DTO classes.
// The list keeps the shared PaginationResponseSchema (results are not stripped).

export const GetLevelParamsSchema = z
  .object({
    levelId: checkIdSchema(LevelMessage.INVALID_DATA)
  })
  .strict()
export type GetLevelParams = z.infer<typeof GetLevelParamsSchema>
export class GetLevelParamsDTO extends createZodDto(GetLevelParamsSchema) {}

export const CreateLevelBodySchema = LevelSchema.pick({
  levelNumber: true,
  requiredExp: true,
  levelType: true,
  nextLevelId: true,
  rewardId: true
}).strict()
export type CreateLevelBody = z.infer<typeof CreateLevelBodySchema>
export class CreateLevelBodyDTO extends createZodDto(CreateLevelBodySchema) {}

export const UpdateLevelBodySchema = CreateLevelBodySchema.partial().strict()
export type UpdateLevelBody = z.infer<typeof UpdateLevelBodySchema>
export class UpdateLevelBodyDTO extends createZodDto(UpdateLevelBodySchema) {}

export const GetLevelDetailResSchema = resSchema(LevelWithRelationsSchema)
export class GetLevelDetailResDTO extends createZodDto(GetLevelDetailResSchema) {}

export const CreateLevelResSchema = resSchema(LevelSchema)
export class CreateLevelResDTO extends createZodDto(CreateLevelResSchema) {}

export const UpdateLevelResSchema = CreateLevelResSchema
export class UpdateLevelResDTO extends createZodDto(UpdateLevelResSchema) {}
