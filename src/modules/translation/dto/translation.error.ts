import { TranslationMessage } from '@/i18n/message-keys'
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common'

// A new instance per throw; `message` is translated from errorKey by
// ApiExceptionFilter (Accept-Language), the old Vietnamese text is the vi value

export class TranslationNotFoundException extends NotFoundException {
  constructor() {
    super({
      message: TranslationMessage.NOT_FOUND,
      errorKey: TranslationMessage.NOT_FOUND
    })
  }
}

// Same (languageId, key) pair already exists
export class TranslationAlreadyExistsException extends ConflictException {
  constructor() {
    super({
      message: TranslationMessage.ALREADY_EXISTS,
      errorKey: TranslationMessage.ALREADY_EXISTS
    })
  }
}

export class InvalidTranslationDataException extends BadRequestException {
  constructor() {
    super({
      message: TranslationMessage.INVALID_DATA,
      errorKey: TranslationMessage.INVALID_DATA
    })
  }
}

// The language the translation points to does not exist
export class TranslationLanguageNotFoundException extends NotFoundException {
  constructor() {
    super({
      message: TranslationMessage.LANGUAGE_NOT_FOUND,
      errorKey: TranslationMessage.LANGUAGE_NOT_FOUND
    })
  }
}

export class DuplicateLanguageException extends ConflictException {
  constructor() {
    super({
      message: TranslationMessage.DUPLICATE_LANGUAGE,
      errorKey: TranslationMessage.DUPLICATE_LANGUAGE
    })
  }
}

export class DuplicateRecordException extends ConflictException {
  constructor() {
    super({
      message: TranslationMessage.ALREADY_EXISTS,
      errorKey: TranslationMessage.ALREADY_EXISTS
    })
  }
}

export class DuplicateValueException extends ConflictException {
  constructor() {
    super({
      message: TranslationMessage.DUPLICATE_VALUE,
      errorKey: TranslationMessage.DUPLICATE_VALUE
    })
  }
}
