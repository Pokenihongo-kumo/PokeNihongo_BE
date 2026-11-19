import { WordTypeMessage } from '@/i18n/message-keys'
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common'

// A new instance per throw; `message` is translated from errorKey by
// ApiExceptionFilter (Accept-Language), the old Vietnamese text is the vi value

export class WordTypeNotFoundException extends NotFoundException {
  constructor() {
    super({ message: WordTypeMessage.NOT_FOUND, errorKey: WordTypeMessage.NOT_FOUND })
  }
}

export class WordTypeAlreadyExistsException extends ConflictException {
  constructor() {
    super({
      message: WordTypeMessage.ALREADY_EXISTS,
      errorKey: WordTypeMessage.ALREADY_EXISTS
    })
  }
}

export class InvalidWordTypeDataException extends BadRequestException {
  constructor() {
    super({
      message: WordTypeMessage.INVALID_DATA,
      errorKey: WordTypeMessage.INVALID_DATA
    })
  }
}
