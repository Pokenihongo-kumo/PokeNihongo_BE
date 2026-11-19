import { LanguagesMessage } from '@/i18n/message-keys'
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common'

// A new instance per throw; `message` is translated from errorKey by
// ApiExceptionFilter (Accept-Language), the old Vietnamese text is the vi value

export class LanguagesNotFoundException extends NotFoundException {
  constructor() {
    super({ message: LanguagesMessage.NOT_FOUND, errorKey: LanguagesMessage.NOT_FOUND })
  }
}

export class LanguagesAlreadyExistsException extends ConflictException {
  constructor() {
    super({
      message: LanguagesMessage.ALREADY_EXISTS,
      errorKey: LanguagesMessage.ALREADY_EXISTS
    })
  }
}

export class InvalidLanguagesDataException extends BadRequestException {
  constructor() {
    super({
      message: LanguagesMessage.INVALID_DATA,
      errorKey: LanguagesMessage.INVALID_DATA
    })
  }
}
