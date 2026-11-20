import { DailyRequestMessage } from '@/i18n/message-keys'
import { ConflictException } from '@nestjs/common'

export class DailyRequestAlreadyExistsException extends ConflictException {
  constructor() {
    super({
      message: DailyRequestMessage.ALREADY_EXISTS,
      errorKey: DailyRequestMessage.ALREADY_EXISTS
    })
  }
}
