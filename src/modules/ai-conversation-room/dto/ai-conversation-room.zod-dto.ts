import { createZodDto } from 'nestjs-zod'
import {
  AIConversationRoomResSchema,
  CreateAIConversationRoomBodySchema,
  GetAIConversationRoomByConversationParamsSchema,
  GetAIConversationRoomByIdParamsSchema,
  GetAIConversationRoomListQuerySchema,
  UpdateAIConversationRoomBodySchema
} from '../entities/ai-conversation-room.entity'

export class CreateAIConversationRoomBodyDTO extends createZodDto(
  CreateAIConversationRoomBodySchema
) {}
export class UpdateAIConversationRoomBodyDTO extends createZodDto(
  UpdateAIConversationRoomBodySchema
) {}
export class GetAIConversationRoomListQueryDTO extends createZodDto(
  GetAIConversationRoomListQuerySchema
) {}
export class GetAIConversationRoomByIdParamsDTO extends createZodDto(
  GetAIConversationRoomByIdParamsSchema
) {}
export class GetAIConversationRoomByConversationParamsDTO extends createZodDto(
  GetAIConversationRoomByConversationParamsSchema
) {}
export class AIConversationRoomResDTO extends createZodDto(AIConversationRoomResSchema) {}
