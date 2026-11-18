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

export type AIConversationRoom = z.infer<typeof AIConversationRoomSchema>
