import { ElementalTypeMessage } from '@/i18n/message-keys'
import { ConflictException } from '@nestjs/common'

export class ElementalTypeAlreadyExistsException extends ConflictException {
  constructor() {
    super({
      message: ElementalTypeMessage.ALREADY_EXISTS,
      errorKey: ElementalTypeMessage.ALREADY_EXISTS
    })
  }
}
