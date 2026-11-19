import { UserTestAttemptMessage as M } from '@/i18n/message-keys'
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException
} from '@nestjs/common'

// A new instance per throw; `message` is translated from errorKey by
// ApiExceptionFilter (Accept-Language), the old Vietnamese text is the vi value

export class UserTestAttemptNotFoundException extends NotFoundException {
  constructor() {
    super({ message: M.NOT_FOUND, errorKey: M.NOT_FOUND })
  }
}

export class TestNotFoundException extends NotFoundException {
  constructor() {
    super({ message: M.TEST_NOT_FOUND, errorKey: M.TEST_NOT_FOUND })
  }
}

// The user does not have this test (was a 400)
export class UserTestNotFoundException extends NotFoundException {
  constructor() {
    super({ message: M.USER_TEST_NOT_FOUND, errorKey: M.USER_TEST_NOT_FOUND })
  }
}

export class TestOutOfLimitException extends BadRequestException {
  constructor() {
    super({ message: M.OUT_OF_LIMIT, errorKey: M.OUT_OF_LIMIT })
  }
}

// The attempt belongs to another user
export class AttemptNotOwnedException extends ForbiddenException {
  constructor() {
    super({ message: M.NOT_OWNED, errorKey: M.NOT_OWNED })
  }
}

// Only an attempt in progress can be abandoned
export class TestAttemptNotInProgressException extends BadRequestException {
  constructor() {
    super({ message: M.NOT_IN_PROGRESS, errorKey: M.NOT_IN_PROGRESS })
  }
}

// The test has no questions (was a 500 from new Error)
export class TestHasNoTestSetException extends BadRequestException {
  constructor() {
    super({ message: M.TEST_HAS_NO_TEST_SET, errorKey: M.TEST_HAS_NO_TEST_SET })
  }
}

// A lesson review of an attempt without answers (was a 500 from new Error)
export class TestAttemptHasNoAnswersException extends BadRequestException {
  constructor() {
    super({ message: M.NO_ANSWERS, errorKey: M.NO_ANSWERS })
  }
}

// Nothing completed yet and less than 80% right: no answers to see
export class ReviewInsufficientScoreException extends ForbiddenException {
  constructor() {
    super({
      message: M.REVIEW_INSUFFICIENT_SCORE,
      errorKey: M.REVIEW_INSUFFICIENT_SCORE
    })
  }
}

export class InvalidUserTestAttemptDataException extends BadRequestException {
  constructor() {
    super({ message: M.INVALID_DATA, errorKey: M.INVALID_DATA })
  }
}
