import { paginatedResSchema } from '@/shared/utils/pagination'
import { resSchema } from '@/shared/utils/res-schema'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import {
  SpeakingStatisticsSchema,
  UserSpeakingAttemptSchema
} from '../entities/speaking.entities'

// Create UserSpeakingAttempt Schema

export const CreateUserSpeakingAttemptSchema = UserSpeakingAttemptSchema.pick({
  questionBankId: true,
  userAudioUrl: true,
  userTranscription: true,
  confidence: true,
  accuracy: true,
  pronunciation: true,
  fluency: true,
  overallScore: true,
  processingTime: true,
  googleApiResponse: true
}).strict()

export type CreateUserSpeakingAttempt = z.infer<typeof CreateUserSpeakingAttemptSchema>

// Create UserSpeakingAttempt DTO
export class CreateUserSpeakingAttemptDTO extends createZodDto(
  CreateUserSpeakingAttemptSchema
) {}

// Update UserSpeakingAttempt Schema

export const UpdateUserSpeakingAttemptSchema =
  CreateUserSpeakingAttemptSchema.partial().strict()

export type UpdateUserSpeakingAttempt = z.infer<typeof UpdateUserSpeakingAttemptSchema>

// Update UserSpeakingAttempt DTO
export class UpdateUserSpeakingAttemptDTO extends createZodDto(
  UpdateUserSpeakingAttemptSchema
) {}

// UserSpeakingAttempt Response Schema

export const UserSpeakingAttemptResSchema = resSchema(UserSpeakingAttemptSchema).strict()

export type UserSpeakingAttemptRes = z.infer<typeof UserSpeakingAttemptResSchema>

// UserSpeakingAttempt Response DTO
export class UserSpeakingAttemptResDTO extends createZodDto(
  UserSpeakingAttemptResSchema
) {}

// UserSpeakingAttempt List Response Schema

export const UserSpeakingAttemptListResSchema = paginatedResSchema(
  UserSpeakingAttemptSchema
).strict()

export type UserSpeakingAttemptListRes = z.infer<typeof UserSpeakingAttemptListResSchema>

// UserSpeakingAttempt List Response DTO
export class UserSpeakingAttemptListResDTO extends createZodDto(
  UserSpeakingAttemptListResSchema
) {}

// Get UserSpeakingAttempt by ID Params Schema

export const GetUserSpeakingAttemptByIdParamsSchema = z
  .object({
    id: z.string().transform((val) => parseInt(val, 10))
  })
  .strict()

export type GetUserSpeakingAttemptByIdParams = z.infer<
  typeof GetUserSpeakingAttemptByIdParamsSchema
>

// Get UserSpeakingAttempt by ID Params DTO
export class GetUserSpeakingAttemptByIdParamsDTO extends createZodDto(
  GetUserSpeakingAttemptByIdParamsSchema
) {}

// Get UserSpeakingAttempt List Query Schema

export const GetUserSpeakingAttemptListQuerySchema = z
  .object({
    currentPage: z
      .string()
      .transform((val) => parseInt(val, 10))
      .optional()
      .default('1'),
    pageSize: z
      .string()
      .transform((val) => parseInt(val, 10))
      .optional()
      .default('10'),
    userId: z
      .string()
      .transform((val) => parseInt(val, 10))
      .optional(),
    questionBankId: z
      .string()
      .transform((val) => parseInt(val, 10))
      .optional(),
    minScore: z
      .string()
      .transform((val) => parseFloat(val))
      .optional(),
    maxScore: z
      .string()
      .transform((val) => parseFloat(val))
      .optional(),
    search: z.string().optional()
  })
  .strict()

export type GetUserSpeakingAttemptListQuery = z.infer<
  typeof GetUserSpeakingAttemptListQuerySchema
>

// Get UserSpeakingAttempt List Query DTO
export class GetUserSpeakingAttemptListQueryDTO extends createZodDto(
  GetUserSpeakingAttemptListQuerySchema
) {}

// Evaluate Speaking Request Schema
// Note: userAudioUrl is optional because file can be uploaded via multipart/form-data
// Validation in service ensures at least one is provided (file or URL)
// questionBankId can be number or string (from multipart/form-data), will be converted in service

export const EvaluateSpeakingRequestSchema = z
  .object({
    questionBankId: z.union([z.number().int().positive(), z.string()]),
    userAudioUrl: z.string().url().optional(),
    languageCode: z.string().optional().default('ja-JP')
  })
  .strict()

export type EvaluateSpeakingRequest = z.infer<typeof EvaluateSpeakingRequestSchema>

// Evaluate Speaking Request DTO
export class EvaluateSpeakingRequestDTO extends createZodDto(
  EvaluateSpeakingRequestSchema
) {}

// Evaluate Speaking Response Schema

export const EvaluateSpeakingResponseSchema = resSchema(
  z.object({
    userSpeakingAttempt: UserSpeakingAttemptSchema,
    evaluation: z.object({
      accuracy: z.number().min(0).max(100),
      pronunciation: z.number().min(0).max(100),
      fluency: z.number().min(0).max(100),
      overallScore: z.number().min(0).max(100),
      confidence: z.number().min(0).max(1),
      transcription: z.string().optional(),
      feedback: z.string().optional()
    })
  })
).strict()

export type EvaluateSpeakingResponse = z.infer<typeof EvaluateSpeakingResponseSchema>

// Evaluate Speaking Response DTO
export class EvaluateSpeakingResponseDTO extends createZodDto(
  EvaluateSpeakingResponseSchema
) {}

export const SpeakingStatisticsResSchema = resSchema(SpeakingStatisticsSchema).strict()

export type SpeakingStatisticsRes = z.infer<typeof SpeakingStatisticsResSchema>

// Speaking Statistics Response DTO
export class SpeakingStatisticsResDTO extends createZodDto(SpeakingStatisticsResSchema) {}
