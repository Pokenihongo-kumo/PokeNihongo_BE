import { checkIdSchema } from '@/common/utils/id.validation'
import { UserAIConversationMessage as M } from '@/i18n/message-keys'
import { resSchema } from '@/shared/utils/res-schema'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import { UserAIConversationSchema } from '../entities/user-ai-conversation.entity'

const roleSchema = z.enum(['USER', 'AI'], {
  errorMap: () => ({ message: M.INVALID_ROLE })
})

const conversationIdSchema = z
  .string({ required_error: M.INVALID_CONVERSATION_ID })
  .trim()
  .min(1, M.INVALID_CONVERSATION_ID)
  .max(100, M.INVALID_CONVERSATION_ID)

// The client's body; the owner comes from the token (userId in the body was
// required and then overwritten)

export const CreateUserAIConversationBodySchema = z
  .object({
    conversationId: conversationIdSchema,
    role: roleSchema,
    message: z.string({ required_error: M.INVALID_MESSAGE }).min(1, M.INVALID_MESSAGE),
    audioUrl: z.string().optional().nullable()
  })
  .strict()

export class CreateUserAIConversationBodyDTO extends createZodDto(
  CreateUserAIConversationBodySchema
) {}

export type CreateUserAIConversationInput = z.infer<
  typeof CreateUserAIConversationBodySchema
> & { userId: number }

export const UpdateUserAIConversationBodySchema = z
  .object({
    message: z.string().min(1, M.INVALID_MESSAGE).optional(),
    audioUrl: z.string().optional().nullable()
  })
  .strict()

export type UpdateUserAIConversationBody = z.infer<
  typeof UpdateUserAIConversationBodySchema
>

export class UpdateUserAIConversationBodyDTO extends createZodDto(
  UpdateUserAIConversationBodySchema
) {}

export const GetUserAIConversationListQuerySchema = z
  .object({
    currentPage: checkIdSchema(M.INVALID_PAGE).default(1),
    pageSize: checkIdSchema(M.INVALID_PAGE_SIZE)
      .max(100, M.INVALID_PAGE_SIZE)
      .default(10),
    conversationId: conversationIdSchema.optional(),
    role: roleSchema.optional()
  })
  .strict()

export type GetUserAIConversationListQuery = z.infer<
  typeof GetUserAIConversationListQuerySchema
>

export class GetUserAIConversationListQueryDTO extends createZodDto(
  GetUserAIConversationListQuerySchema
) {}

export const GetUserAIConversationByIdParamsSchema = z
  .object({ id: checkIdSchema(M.INVALID_ID) })
  .strict()

export class GetUserAIConversationByIdParamsDTO extends createZodDto(
  GetUserAIConversationByIdParamsSchema
) {}

export const GetUserAIConversationByConversationParamsSchema = z
  .object({ conversationId: conversationIdSchema })
  .strict()

export class GetUserAIConversationByConversationParamsDTO extends createZodDto(
  GetUserAIConversationByConversationParamsSchema
) {}

// Was the bare entity: every single-message response failed serialization (500)

export const UserAIConversationResSchema = resSchema(UserAIConversationSchema)

export class UserAIConversationResDTO extends createZodDto(UserAIConversationResSchema) {}
