import { z } from 'zod'

// UserAIConversation schema: one message of a kaiwa conversation
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

export type UserAIConversation = z.infer<typeof UserAIConversationSchema>
