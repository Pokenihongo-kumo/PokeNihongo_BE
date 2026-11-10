import { KanjiReadingMessage } from '@/i18n/message-keys'
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common'

// A new instance per throw; `message` is translated from errorKey by
// ApiExceptionFilter (Accept-Language), the old Vietnamese text is the vi value

export class KanjiReadingNotFoundException extends NotFoundException {
  constructor() {
    super({
      message: KanjiReadingMessage.NOT_FOUND,
      errorKey: KanjiReadingMessage.NOT_FOUND
    })
  }
}

// Same kanji, reading type and reading
export class KanjiReadingAlreadyExistsException extends ConflictException {
  constructor() {
    super({
      message: KanjiReadingMessage.ALREADY_EXISTS,
      errorKey: KanjiReadingMessage.ALREADY_EXISTS
    })
  }
}

export class InvalidKanjiReadingDataException extends BadRequestException {
  constructor() {
    super({
      message: KanjiReadingMessage.INVALID_DATA,
      errorKey: KanjiReadingMessage.INVALID_DATA
    })
  }
}

// The kanji the reading points to does not exist
export class KanjiReadingKanjiNotFoundException extends NotFoundException {
  constructor() {
    super({
      message: KanjiReadingMessage.KANJI_NOT_FOUND,
      errorKey: KanjiReadingMessage.KANJI_NOT_FOUND
    })
  }
}
