import { z } from 'zod'

// UserAIConversation schema
export const UserAIConversationSchema = z.object({
  id: z.number(),
  userId: z.number(),
  conversationId: z.string(),
  role: z.enum(['USER', 'AI']),
  message: z.string(),
  audioUrl: z.string().nullable(),
  deletedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date()
})

// Create UserAIConversation schema
export const CreateUserAIConversationBodySchema = z
  .object({
    userId: z.number(),
    conversationId: z.string(),
    role: z.enum(['USER', 'AI']),
    message: z.string(),
    audioUrl: z.string().optional().nullable()
  })
  .strict()

// Update UserAIConversation schema
export const UpdateUserAIConversationBodySchema = z
  .object({
    message: z.string().optional(),
    audioUrl: z.string().optional().nullable()
  })
  .strict()

// Query params
export const GetUserAIConversationListQuerySchema = z
  .object({
    currentPage: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(10),
    conversationId: z.string().optional(),
    role: z.enum(['USER', 'AI']).optional()
  })
  .strict()

// Params
export const GetUserAIConversationByIdParamsSchema = z
  .object({
    id: z.coerce.number().int().positive()
  })
  .strict()

// Type exports
export type UserAIConversationType = z.infer<typeof UserAIConversationSchema>
export type CreateUserAIConversationBodyType = z.infer<
  typeof CreateUserAIConversationBodySchema
>
export type UpdateUserAIConversationBodyType = z.infer<
  typeof UpdateUserAIConversationBodySchema
>
export type GetUserAIConversationListQueryType = z.infer<
  typeof GetUserAIConversationListQuerySchema
>
export type GetUserAIConversationByIdParamsType = z.infer<
  typeof GetUserAIConversationByIdParamsSchema
>
