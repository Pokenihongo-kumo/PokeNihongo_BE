import { TestSetMessage as M } from '@/i18n/message-keys'
import { BadRequestException, NotFoundException } from '@nestjs/common'

// A new instance per throw; `message` is translated from errorKey (and
// errorArgs) by ApiExceptionFilter, the old Vietnamese text is the vi value

export class TestSetNotFoundException extends NotFoundException {
  constructor() {
    super({ message: M.NOT_FOUND, errorKey: M.NOT_FOUND })
  }
}

export class InvalidTestSetDataException extends BadRequestException {
  constructor() {
    super({ message: M.INVALID_DATA, errorKey: M.INVALID_DATA })
  }
}

export class TestSetQuestionBankNotFoundException extends NotFoundException {
  constructor(id: number) {
    super({
      message: M.QUESTION_BANK_NOT_FOUND,
      errorKey: M.QUESTION_BANK_NOT_FOUND,
      errorArgs: { id }
    })
  }
}

// The test set has questions, so its level or type cannot change that way
export class TestSetChangeNotAllowedException extends BadRequestException {
  constructor(rule: TestSetChangeRule, args?: Record<string, string>) {
    super({ message: rule, errorKey: rule, errorArgs: args })
  }
}

export type TestSetChangeRule =
  | typeof M.CANNOT_CHANGE_LEVEL_HAS_QUESTIONS
  | typeof M.CANNOT_CHANGE_TYPE_GENERAL_MULTIPLE
  | typeof M.CANNOT_CHANGE_TYPE_SPECIFIC
  | typeof M.CANNOT_CHANGE_TYPE_GENERAL_SINGLE
