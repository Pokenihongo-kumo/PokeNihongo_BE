import { UserAIConversationMessage as M } from '@/i18n/message-keys'
import { BadRequestException, NotFoundException } from '@nestjs/common'

// A new instance per throw; `message` is translated from errorKey by
// ApiExceptionFilter (Accept-Language). Another user's message is "not found".

export class UserAIConversationNotFoundException extends NotFoundException {
  constructor() {
    super({ message: M.NOT_FOUND, errorKey: M.NOT_FOUND })
  }
}

export class InvalidUserAIConversationDataException extends BadRequestException {
  constructor() {
    super({ message: M.INVALID_DATA, errorKey: M.INVALID_DATA })
  }
}
