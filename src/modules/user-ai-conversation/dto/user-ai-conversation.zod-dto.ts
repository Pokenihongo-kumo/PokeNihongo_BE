import { createZodDto } from 'nestjs-zod'
import {
  CreateUserAIConversationBodySchema,
  GetUserAIConversationByConversationParamsSchema,
  GetUserAIConversationByIdParamsSchema,
  GetUserAIConversationListQuerySchema,
  UpdateUserAIConversationBodySchema,
  UserAIConversationResSchema
} from '../entities/user-ai-conversation.entity'

export class CreateUserAIConversationBodyDTO extends createZodDto(
  CreateUserAIConversationBodySchema
) {}
export class UpdateUserAIConversationBodyDTO extends createZodDto(
  UpdateUserAIConversationBodySchema
) {}
export class GetUserAIConversationByIdParamsDTO extends createZodDto(
  GetUserAIConversationByIdParamsSchema
) {}
export class GetUserAIConversationByConversationParamsDTO extends createZodDto(
  GetUserAIConversationByConversationParamsSchema
) {}
export class GetUserAIConversationListQueryDTO extends createZodDto(
  GetUserAIConversationListQuerySchema
) {}
export class UserAIConversationResDTO extends createZodDto(UserAIConversationResSchema) {}
