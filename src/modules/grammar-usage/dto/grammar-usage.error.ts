import { GrammarMessage, GrammarUsageMessage } from '@/i18n/message-keys'
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common'

// A new instance per throw; `message` is translated from errorKey by
// ApiExceptionFilter (Accept-Language), the old Vietnamese text is the vi value

export class GrammarUsageNotFoundException extends NotFoundException {
  constructor() {
    super({
      message: GrammarUsageMessage.NOT_FOUND,
      errorKey: GrammarUsageMessage.NOT_FOUND
    })
  }
}

export class GrammarUsageAlreadyExistsException extends ConflictException {
  constructor() {
    super({
      message: GrammarUsageMessage.ALREADY_EXISTS,
      errorKey: GrammarUsageMessage.ALREADY_EXISTS
    })
  }
}

export class InvalidGrammarUsageDataException extends BadRequestException {
  constructor() {
    super({
      message: GrammarUsageMessage.INVALID_DATA,
      errorKey: GrammarUsageMessage.INVALID_DATA
    })
  }
}

// The usage's grammar does not exist
export class GrammarNotFoundException extends NotFoundException {
  constructor() {
    super({ message: GrammarMessage.NOT_FOUND, errorKey: GrammarMessage.NOT_FOUND })
  }
}
