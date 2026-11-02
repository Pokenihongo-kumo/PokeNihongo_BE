import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'

extendZodWithOpenApi(z)
patchNestJsSwagger()

// UserSpeakingAttempt Schema
export const UserSpeakingAttemptSchema = z.object({
  id: z.number(),
  userId: z.number(),
  questionBankId: z.number(),
  userAudioUrl: z.string().url(),
  userTranscription: z.string().nullable().optional(),
  confidence: z.number().min(0).max(1).nullable().optional(),
  accuracy: z.number().min(0).max(100).nullable().optional(),
  pronunciation: z.number().min(0).max(100).nullable().optional(),
  fluency: z.number().min(0).max(100).nullable().optional(),
  overallScore: z.number().min(0).max(100).nullable().optional(),
  processingTime: z.number().int().nullable().optional(),
  googleApiResponse: z.any().nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date()
})

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

// Update UserSpeakingAttempt Schema
export const UpdateUserSpeakingAttemptSchema =
  CreateUserSpeakingAttemptSchema.partial().strict()

// UserSpeakingAttempt Response Schema
export const UserSpeakingAttemptResSchema = z
  .object({
    statusCode: z.number(),
    data: UserSpeakingAttemptSchema,
    message: z.string()
  })
  .strict()

// UserSpeakingAttempt List Response Schema
export const UserSpeakingAttemptListResSchema = z
  .object({
    statusCode: z.number(),
    data: z.object({
      results: z.array(UserSpeakingAttemptSchema),
      pagination: z.object({
        current: z.number(),
        pageSize: z.number(),
        totalPage: z.number(),
        totalItem: z.number()
      })
    }),
    message: z.string()
  })
  .strict()

// Get UserSpeakingAttempt by ID Params Schema
export const GetUserSpeakingAttemptByIdParamsSchema = z
  .object({
    id: z.string().transform((val) => parseInt(val, 10))
  })
  .strict()

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

// Evaluate Speaking Response Schema
export const EvaluateSpeakingResponseSchema = z
  .object({
    statusCode: z.number(),
    data: z.object({
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
    }),
    message: z.string()
  })
  .strict()

// Speaking Statistics Schema
export const SpeakingStatisticsSchema = z.object({
  totalAttempts: z.number(),
  averageScore: z.number(),
  bestScore: z.number(),
  attemptsByLevel: z.record(z.string(), z.number()),
  attemptsByType: z.record(z.string(), z.number()),
  recentAttempts: z.array(UserSpeakingAttemptSchema)
})

export const SpeakingStatisticsResSchema = z
  .object({
    statusCode: z.number(),
    data: SpeakingStatisticsSchema,
    message: z.string()
  })
  .strict()

// Types
export type UserSpeakingAttemptType = z.infer<typeof UserSpeakingAttemptSchema>
export type CreateUserSpeakingAttemptType = z.infer<
  typeof CreateUserSpeakingAttemptSchema
>
export type UpdateUserSpeakingAttemptType = z.infer<
  typeof UpdateUserSpeakingAttemptSchema
>
export type UserSpeakingAttemptResType = z.infer<typeof UserSpeakingAttemptResSchema>
export type UserSpeakingAttemptListResType = z.infer<
  typeof UserSpeakingAttemptListResSchema
>
export type GetUserSpeakingAttemptByIdParamsType = z.infer<
  typeof GetUserSpeakingAttemptByIdParamsSchema
>
export type GetUserSpeakingAttemptListQueryType = z.infer<
  typeof GetUserSpeakingAttemptListQuerySchema
>
export type EvaluateSpeakingRequestType = z.infer<typeof EvaluateSpeakingRequestSchema>
export type EvaluateSpeakingResponseType = z.infer<typeof EvaluateSpeakingResponseSchema>
export type SpeakingStatisticsType = z.infer<typeof SpeakingStatisticsSchema>
export type SpeakingStatisticsResType = z.infer<typeof SpeakingStatisticsResSchema>
