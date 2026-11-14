import { UserTestAnswerLogMessage as M } from '@/i18n/message-keys'
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException
} from '@nestjs/common'

// A new instance per throw; `message` is translated from errorKey by
// ApiExceptionFilter (Accept-Language), the old Vietnamese text is the vi value

export class UserTestAnswerLogNotFoundException extends NotFoundException {
  constructor(
    key:
      | typeof M.NOT_FOUND
      | typeof M.ATTEMPT_NOT_FOUND
      | typeof M.ANSWER_NOT_FOUND = M.NOT_FOUND
  ) {
    super({ message: key, errorKey: key })
  }
}

// The attempt belongs to another user
export class AttemptNotOwnedException extends ForbiddenException {
  constructor() {
    super({ message: M.ATTEMPT_NOT_OWNED, errorKey: M.ATTEMPT_NOT_OWNED })
  }
}

// The question/answer does not fit the attempt's test
export class AnswerLogRuleViolationException extends BadRequestException {
  constructor(
    rule:
      | typeof M.TEST_HAS_NO_TEST_SET
      | typeof M.QUESTION_NOT_IN_TEST
      | typeof M.ANSWER_NOT_IN_QUESTION
  ) {
    super({ message: rule, errorKey: rule })
  }
}

export class InvalidUserTestAnswerLogDataException extends BadRequestException {
  constructor() {
    super({ message: M.INVALID_DATA, errorKey: M.INVALID_DATA })
  }
}
