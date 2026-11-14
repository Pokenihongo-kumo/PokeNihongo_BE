import { AIConversationRoomMessage as M } from '@/i18n/message-keys'
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common'

// A new instance per throw; `message` is translated from errorKey by
// ApiExceptionFilter (Accept-Language). Another user's room is "not found".

export class AIConversationRoomNotFoundException extends NotFoundException {
  constructor() {
    super({ message: M.NOT_FOUND, errorKey: M.NOT_FOUND })
  }
}

// The conversationId is another user's room (create used to update it)
export class AIConversationTakenException extends ConflictException {
  constructor() {
    super({ message: M.CONVERSATION_TAKEN, errorKey: M.CONVERSATION_TAKEN })
  }
}

export class InvalidAIConversationRoomDataException extends BadRequestException {
  constructor() {
    super({ message: M.INVALID_DATA, errorKey: M.INVALID_DATA })
  }
}
