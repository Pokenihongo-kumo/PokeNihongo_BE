import { RewardMessage } from '@/i18n/message-keys'
import { ConflictException } from '@nestjs/common'

export class RewardAlreadyExistsException extends ConflictException {
  constructor() {
    super({
      message: RewardMessage.ALREADY_EXISTS,
      errorKey: RewardMessage.ALREADY_EXISTS
    })
  }
}
