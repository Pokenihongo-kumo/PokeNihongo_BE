import { z } from 'zod'

// AIConversationRoom schema
export const AIConversationRoomSchema = z.object({
  id: z.string(),
  userId: z.number(),
  conversationId: z.string(),
  title: z.string().nullable(),
  lastMessage: z.string().nullable(),
  lastMessageAt: z.date().nullable(),
  isArchived: z.boolean(),
  voiceName: z.string().nullable(),
  deletedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date()
})

// Create AIConversationRoom schema
export const CreateAIConversationRoomBodySchema = z
  .object({
    userId: z.number(),
    conversationId: z.string(),
    title: z.string().optional().nullable(),
    voiceName: z.string().optional().nullable()
  })
  .strict()

// Update AIConversationRoom schema
export const UpdateAIConversationRoomBodySchema = z
  .object({
    title: z.string().optional().nullable(),
    lastMessage: z.string().optional().nullable(),
    lastMessageAt: z.date().optional().nullable(),
    isArchived: z.boolean().optional(),
    voiceName: z.string().optional().nullable()
  })
  .strict()

// Query params
export const GetAIConversationRoomListQuerySchema = z
  .object({
    currentPage: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(10),
    isArchived: z.coerce.boolean().optional()
  })
  .strict()

// Params
export const GetAIConversationRoomByIdParamsSchema = z
  .object({
    id: z.string()
  })
  .strict()

// Type exports
export type AIConversationRoomType = z.infer<typeof AIConversationRoomSchema>
export type CreateAIConversationRoomBodyType = z.infer<
  typeof CreateAIConversationRoomBodySchema
>
export type UpdateAIConversationRoomBodyType = z.infer<
  typeof UpdateAIConversationRoomBodySchema
>
export type GetAIConversationRoomListQueryType = z.infer<
  typeof GetAIConversationRoomListQuerySchema
>
export type GetAIConversationRoomByIdParamsType = z.infer<
  typeof GetAIConversationRoomByIdParamsSchema
>
