import { LevelMessage } from '@/i18n/message-keys'
import { ConflictException } from '@nestjs/common'

export class LevelAlreadyExistsException extends ConflictException {
  constructor() {
    super({
      message: LevelMessage.ALREADY_EXISTS,
      errorKey: LevelMessage.ALREADY_EXISTS
    })
  }
}

export class ConflictTypeNextLevelException extends ConflictException {
  constructor() {
    super({
      message: LevelMessage.CONFLICT_TYPE_NEXT_LEVEL,
      errorKey: LevelMessage.CONFLICT_TYPE_NEXT_LEVEL
    })
  }
}
