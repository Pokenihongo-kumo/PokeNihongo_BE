import { FeatureMessage } from '@/i18n/message-keys'
import { ConflictException } from '@nestjs/common'

export class FeatureAlreadyExistsException extends ConflictException {
  constructor() {
    super({
      message: FeatureMessage.ALREADY_EXISTS,
      errorKey: FeatureMessage.ALREADY_EXISTS
    })
  }
}
