import { checkIdSchema } from '@/common/utils/id.validation'
import { AIConversationRoomMessage as M } from '@/i18n/message-keys'
import { resSchema } from '@/shared/utils/res-schema'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import { AIConversationRoomSchema } from '../entities/ai-conversation-room.entity'

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

export type CreateAIConversationRoomBody = z.infer<
  typeof CreateAIConversationRoomBodySchema
>

export class CreateAIConversationRoomBodyDTO extends createZodDto(
  CreateAIConversationRoomBodySchema
) {}

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

export type UpdateAIConversationRoomBody = z.infer<
  typeof UpdateAIConversationRoomBodySchema
>

export class UpdateAIConversationRoomBodyDTO extends createZodDto(
  UpdateAIConversationRoomBodySchema
) {}

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

export type GetAIConversationRoomListQuery = z.infer<
  typeof GetAIConversationRoomListQuerySchema
>

export class GetAIConversationRoomListQueryDTO extends createZodDto(
  GetAIConversationRoomListQuerySchema
) {}

export const GetAIConversationRoomByIdParamsSchema = z
  .object({ id: z.string().trim().min(1, M.INVALID_ID).max(100, M.INVALID_ID) })
  .strict()

export class GetAIConversationRoomByIdParamsDTO extends createZodDto(
  GetAIConversationRoomByIdParamsSchema
) {}

export const GetAIConversationRoomByConversationParamsSchema = z
  .object({
    conversationId: z
      .string()
      .trim()
      .min(1, M.INVALID_CONVERSATION_ID)
      .max(100, M.INVALID_CONVERSATION_ID)
  })
  .strict()

export class GetAIConversationRoomByConversationParamsDTO extends createZodDto(
  GetAIConversationRoomByConversationParamsSchema
) {}

export const AIConversationRoomResSchema = resSchema(AIConversationRoomSchema)

export class AIConversationRoomResDTO extends createZodDto(AIConversationRoomResSchema) {}
