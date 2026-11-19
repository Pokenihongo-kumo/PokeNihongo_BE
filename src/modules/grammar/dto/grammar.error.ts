import { GrammarMessage } from '@/i18n/message-keys'
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common'

// A new instance per throw; `message` is translated from errorKey by
// ApiExceptionFilter (Accept-Language), the old Vietnamese text is the vi value

export class GrammarNotFoundException extends NotFoundException {
  constructor() {
    super({ message: GrammarMessage.NOT_FOUND, errorKey: GrammarMessage.NOT_FOUND })
  }
}

export class GrammarAlreadyExistsException extends ConflictException {
  constructor() {
    super({
      message: GrammarMessage.ALREADY_EXISTS,
      errorKey: GrammarMessage.ALREADY_EXISTS
    })
  }
}

export class InvalidGrammarDataException extends BadRequestException {
  constructor() {
    super({ message: GrammarMessage.INVALID_DATA, errorKey: GrammarMessage.INVALID_DATA })
  }
}
