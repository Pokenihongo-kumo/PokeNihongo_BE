import { KanjiMessage as M } from '@/i18n/message-keys'
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnprocessableEntityException
} from '@nestjs/common'

// A new instance per throw; `message` is translated from errorKey by
// ApiExceptionFilter (Accept-Language), the old Vietnamese text is the vi value

export class KanjiNotFoundException extends NotFoundException {
  constructor() {
    super({ message: M.NOT_FOUND, errorKey: M.NOT_FOUND })
  }
}

export class KanjiAlreadyExistsException extends ConflictException {
  constructor() {
    super({ message: M.ALREADY_EXISTS, errorKey: M.ALREADY_EXISTS })
  }
}

// Unexpected failure, or a file/option the import cannot use
export class InvalidKanjiDataException extends BadRequestException {
  constructor(
    key:
      | typeof M.INVALID_DATA
      | typeof M.INVALID_FILE
      | typeof M.INVALID_IMPORT_LANGUAGE = M.INVALID_DATA
  ) {
    super({ message: key, errorKey: key })
  }
}

// The identifier of PUT /kanji/:identifier is neither an id nor one kanji
export class KanjiCharacterInvalidException extends UnprocessableEntityException {
  constructor() {
    super({ message: M.CHARACTER_INVALID, errorKey: M.CHARACTER_INVALID })
  }
}
