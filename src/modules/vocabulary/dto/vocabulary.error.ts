import { VocabularyMessage as M } from '@/i18n/message-keys'
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common'

// A new instance per throw (callers compare with instanceof; they used to
// compare with === against shared instances). `message` is translated from
// errorKey by ApiExceptionFilter, the old Vietnamese text is the vi value

export class VocabularyNotFoundException extends NotFoundException {
  constructor() {
    super({ message: M.NOT_FOUND, errorKey: M.NOT_FOUND })
  }
}

export class VocabularyAlreadyExistsException extends ConflictException {
  constructor() {
    super({ message: M.ALREADY_EXISTS, errorKey: M.ALREADY_EXISTS })
  }
}

export class InvalidVocabularyDataException extends BadRequestException {
  constructor() {
    super({ message: M.INVALID_DATA, errorKey: M.INVALID_DATA })
  }
}

export class MeaningAlreadyExistsException extends ConflictException {
  constructor() {
    super({ message: M.MEANING_ALREADY_EXISTS, errorKey: M.MEANING_ALREADY_EXISTS })
  }
}

export class VocabularyJapaneseTextInvalidException extends BadRequestException {
  constructor() {
    super({ message: M.JAPANESE_TEXT_INVALID, errorKey: M.JAPANESE_TEXT_INVALID })
  }
}
