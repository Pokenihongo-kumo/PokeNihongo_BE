import { QuestionBankMessage as M } from '@/i18n/message-keys'
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common'

// A new instance per throw; `message` is translated from errorKey by
// ApiExceptionFilter (Accept-Language), the old Vietnamese text is the vi value

export class QuestionBankNotFoundException extends NotFoundException {
  constructor() {
    super({ message: M.NOT_FOUND, errorKey: M.NOT_FOUND })
  }
}

// Bulk delete: none of the ids exist
export class NoQuestionBankDeletedException extends NotFoundException {
  constructor() {
    super({ message: M.NONE_DELETED, errorKey: M.NONE_DELETED })
  }
}

// Same questionJp already saved
export class QuestionBankAlreadyExistsException extends ConflictException {
  constructor() {
    super({ message: M.ALREADY_EXISTS, errorKey: M.ALREADY_EXISTS })
  }
}

export class InvalidQuestionBankDataException extends BadRequestException {
  constructor() {
    super({ message: M.INVALID_DATA, errorKey: M.INVALID_DATA })
  }
}

// For internal callers that skip the request schema (e.g. the testset upsert)
export class QuestionBankPronunciationRequiredException extends BadRequestException {
  constructor() {
    super({ message: M.PRONUNCIATION_REQUIRED, errorKey: M.PRONUNCIATION_REQUIRED })
  }
}
