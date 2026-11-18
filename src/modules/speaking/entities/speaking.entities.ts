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

// Speaking Statistics Schema
export const SpeakingStatisticsSchema = z.object({
  totalAttempts: z.number(),
  averageScore: z.number(),
  bestScore: z.number(),
  attemptsByLevel: z.record(z.string(), z.number()),
  attemptsByType: z.record(z.string(), z.number()),
  recentAttempts: z.array(UserSpeakingAttemptSchema)
})

// Types
export type UserSpeakingAttempt = z.infer<typeof UserSpeakingAttemptSchema>
export type SpeakingStatistics = z.infer<typeof SpeakingStatisticsSchema>
