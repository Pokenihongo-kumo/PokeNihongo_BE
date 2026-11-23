import { DebuffRoundMessage } from '@/i18n/message-keys'
import { ConflictException } from '@nestjs/common'

export class DebuffRoundAlreadyExistsException extends ConflictException {
  constructor() {
    super({
      message: DebuffRoundMessage.ALREADY_EXISTS,
      errorKey: DebuffRoundMessage.ALREADY_EXISTS
    })
  }
}
