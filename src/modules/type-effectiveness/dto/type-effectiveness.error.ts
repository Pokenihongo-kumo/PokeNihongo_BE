import { TypeEffectivenessMessage } from '@/i18n/message-keys'
import { ConflictException } from '@nestjs/common'

export class TypeEffectivenessAlreadyExistsException extends ConflictException {
  constructor() {
    super({
      message: TypeEffectivenessMessage.ALREADY_EXISTS,
      errorKey: TypeEffectivenessMessage.ALREADY_EXISTS
    })
  }
}
