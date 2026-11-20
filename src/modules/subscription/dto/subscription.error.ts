import { SubscriptionMessage } from '@/i18n/message-keys'
import { ConflictException } from '@nestjs/common'

export class SubscriptionAlreadyExistsException extends ConflictException {
  constructor() {
    super({
      message: SubscriptionMessage.ALREADY_EXISTS,
      errorKey: SubscriptionMessage.ALREADY_EXISTS
    })
  }
}
