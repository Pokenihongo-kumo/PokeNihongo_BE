import { createZodDto } from 'nestjs-zod'
import {
  CreateUserSpeakingAttemptSchema,
  UpdateUserSpeakingAttemptSchema,
  UserSpeakingAttemptResSchema,
  UserSpeakingAttemptListResSchema,
  GetUserSpeakingAttemptByIdParamsSchema,
  GetUserSpeakingAttemptListQuerySchema,
  EvaluateSpeakingRequestSchema,
  EvaluateSpeakingResponseSchema,
  SpeakingStatisticsResSchema
} from '../entities/speaking.entities'

// Create UserSpeakingAttempt DTO
export class CreateUserSpeakingAttemptDTO extends createZodDto(
  CreateUserSpeakingAttemptSchema
) {}

// Update UserSpeakingAttempt DTO
export class UpdateUserSpeakingAttemptDTO extends createZodDto(
  UpdateUserSpeakingAttemptSchema
) {}

// UserSpeakingAttempt Response DTO
export class UserSpeakingAttemptResDTO extends createZodDto(
  UserSpeakingAttemptResSchema
) {}

// UserSpeakingAttempt List Response DTO
export class UserSpeakingAttemptListResDTO extends createZodDto(
  UserSpeakingAttemptListResSchema
) {}

// Get UserSpeakingAttempt by ID Params DTO
export class GetUserSpeakingAttemptByIdParamsDTO extends createZodDto(
  GetUserSpeakingAttemptByIdParamsSchema
) {}

// Get UserSpeakingAttempt List Query DTO
export class GetUserSpeakingAttemptListQueryDTO extends createZodDto(
  GetUserSpeakingAttemptListQuerySchema
) {}

// Evaluate Speaking Request DTO
export class EvaluateSpeakingRequestDTO extends createZodDto(
  EvaluateSpeakingRequestSchema
) {}

// Evaluate Speaking Response DTO
export class EvaluateSpeakingResponseDTO extends createZodDto(
  EvaluateSpeakingResponseSchema
) {}

// Speaking Statistics Response DTO
export class SpeakingStatisticsResDTO extends createZodDto(SpeakingStatisticsResSchema) {}
