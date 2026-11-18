import { checkIdSchema } from '@/common/utils/id.validation'
import { AIConversationRoomMessage as M } from '@/i18n/message-keys'
import { resSchema } from '@/shared/utils/res-schema'
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

const titleSchema = z.string().max(200, M.INVALID_TITLE).nullable().optional()
const voiceSchema = z.string().max(50, M.INVALID_VOICE).nullable().optional()

// The client's body; the owner comes from the token
export const CreateAIConversationRoomBodySchema = z
  .object({
    conversationId: z
      .string({ required_error: M.INVALID_CONVERSATION_ID })
      .trim()
      .min(1, M.INVALID_CONVERSATION_ID)
      .max(100, M.INVALID_CONVERSATION_ID),
    title: titleSchema,
    voiceName: voiceSchema
  })
  .strict()

// What the service writes: the client's body plus its owner (the kaiwa
// gateway calls the service with these too)
export type CreateAIConversationRoomInput = z.infer<
  typeof CreateAIConversationRoomBodySchema
> & { userId: number }

export const UpdateAIConversationRoomBodySchema = z
  .object({
    title: titleSchema,
    isArchived: z.boolean({ invalid_type_error: M.INVALID_FLAG }).optional(),
    voiceName: voiceSchema
  })
  .strict()

// The gateway also writes the last message of a room
export type UpdateAIConversationRoomData = z.infer<
  typeof UpdateAIConversationRoomBodySchema
> & { lastMessage?: string | null; lastMessageAt?: Date | null }

export const GetAIConversationRoomListQuerySchema = z
  .object({
    currentPage: checkIdSchema(M.INVALID_PAGE).default(1),
    pageSize: checkIdSchema(M.INVALID_PAGE_SIZE)
      .max(100, M.INVALID_PAGE_SIZE)
      .default(10),
    isArchived: z
      .enum(['true', 'false'], { errorMap: () => ({ message: M.INVALID_FLAG }) })
      .transform((value) => value === 'true')
      .optional()
  })
  .strict()

export const GetAIConversationRoomByIdParamsSchema = z
  .object({ id: z.string().trim().min(1, M.INVALID_ID).max(100, M.INVALID_ID) })
  .strict()

export const GetAIConversationRoomByConversationParamsSchema = z
  .object({
    conversationId: z
      .string()
      .trim()
      .min(1, M.INVALID_CONVERSATION_ID)
      .max(100, M.INVALID_CONVERSATION_ID)
  })
  .strict()

export const AIConversationRoomResSchema = resSchema(AIConversationRoomSchema)

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
