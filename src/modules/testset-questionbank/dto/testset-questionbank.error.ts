import { TestSetQuestionBankMessage as M } from '@/i18n/message-keys'
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common'

// A new instance per throw; `message` is translated from errorKey (and
// errorArgs) by ApiExceptionFilter, the old Vietnamese text is the vi value

export class TestSetQuestionBankNotFoundException extends NotFoundException {
  constructor() {
    super({ message: M.NOT_FOUND, errorKey: M.NOT_FOUND })
  }
}

export class TestSetQuestionBankAlreadyExistsException extends ConflictException {
  constructor() {
    super({ message: M.ALREADY_EXISTS, errorKey: M.ALREADY_EXISTS })
  }
}

export class InvalidTestSetQuestionBankDataException extends BadRequestException {
  constructor() {
    super({ message: M.INVALID_DATA, errorKey: M.INVALID_DATA })
  }
}

export class TestSetNotFoundException extends NotFoundException {
  constructor() {
    super({ message: M.TEST_SET_NOT_FOUND, errorKey: M.TEST_SET_NOT_FOUND })
  }
}

export class QuestionBankNotFoundException extends NotFoundException {
  constructor() {
    super({ message: M.QUESTION_BANK_NOT_FOUND, errorKey: M.QUESTION_BANK_NOT_FOUND })
  }
}

// The question does not fit the test set (type or level)
export class TestSetQuestionBankRuleViolationException extends BadRequestException {
  constructor(
    rule: TestSetQuestionBankRule,
    args?: { testSetLevel: number; questionLevel: number | string }
  ) {
    super({ message: rule, errorKey: rule, errorArgs: args })
  }
}

export type TestSetQuestionBankRule =
  | typeof M.TYPE_INCOMPATIBLE
  | typeof M.LEVEL_ABOVE_TEST_SET
  | typeof M.LEVEL_MISMATCH
