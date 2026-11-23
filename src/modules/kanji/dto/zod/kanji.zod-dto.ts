import { z } from 'zod'
import { createZodDto } from 'nestjs-zod'
import { KanjiSchema } from '../../entities/kanji.entity'
import {
  CreateKanjiSchema,
  GetKanjiByIdParamsSchema,
  GetKanjiListQuerySchema,
  KanjiListResponseSchema,
  KanjiListResSchema,
  KanjiManagementListResSchema,
  KanjiResSchema,
  UpdateKanjiSchema
} from '../kanji.zod-dto'

// Zod DTOs - automatically validated

export type CreateKanjiBody = z.infer<typeof CreateKanjiSchema>

export class CreateKanjiBodyDTO extends createZodDto(CreateKanjiSchema) {}

export type UpdateKanjiBody = z.infer<typeof UpdateKanjiSchema>

export class UpdateKanjiBodyDTO extends createZodDto(UpdateKanjiSchema) {}

export type GetKanjiByIdParams = z.infer<typeof GetKanjiByIdParamsSchema>

export class GetKanjiByIdParamsDTO extends createZodDto(GetKanjiByIdParamsSchema) {}

export type GetKanjiListQuery = z.infer<typeof GetKanjiListQuerySchema>

export class GetKanjiListQueryDTO extends createZodDto(GetKanjiListQuerySchema) {}

export type KanjiResponse = z.infer<typeof KanjiSchema>

export class KanjiResponseDTO extends createZodDto(KanjiSchema) {}

export type KanjiListResponse = z.infer<typeof KanjiListResponseSchema>

export class KanjiListResponseDTO extends createZodDto(KanjiListResponseSchema) {}

export type KanjiRes = z.infer<typeof KanjiResSchema>

export class KanjiResDTO extends createZodDto(KanjiResSchema) {}

export type KanjiListRes = z.infer<typeof KanjiListResSchema>

export class KanjiListResDTO extends createZodDto(KanjiListResSchema) {}

export type KanjiManagementListRes = z.infer<typeof KanjiManagementListResSchema>

export class KanjiManagementListResDTO extends createZodDto(
  KanjiManagementListResSchema
) {}
