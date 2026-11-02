import { createZodDto } from 'nestjs-zod'
import {
  CreateUserAIConversationBodySchema,
  UpdateUserAIConversationBodySchema,
  GetUserAIConversationByIdParamsSchema,
  GetUserAIConversationListQuerySchema,
  UserAIConversationSchema
} from '../entities/user-ai-conversation.entities'

export class CreateUserAIConversationBodyDTO extends createZodDto(
  CreateUserAIConversationBodySchema
) {}
export class UpdateUserAIConversationBodyDTO extends createZodDto(
  UpdateUserAIConversationBodySchema
) {}
export class GetUserAIConversationByIdParamsDTO extends createZodDto(
  GetUserAIConversationByIdParamsSchema
) {}
export class GetUserAIConversationListQueryDTO extends createZodDto(
  GetUserAIConversationListQuerySchema
) {}
export class UserAIConversationResDTO extends createZodDto(UserAIConversationSchema) {}
