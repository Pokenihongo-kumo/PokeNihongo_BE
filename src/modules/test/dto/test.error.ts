import { TestMessage as M } from '@/i18n/message-keys'
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException
} from '@nestjs/common'

// A new instance per throw (the old code threw the classes themselves, so
// `instanceof` never matched and these became 500s or generic 400s).
// `message` is translated from errorKey/errorArgs by ApiExceptionFilter

type Args = Record<string, string | number>

export class TestNotFoundException extends NotFoundException {
  constructor(
    key: typeof M.NOT_FOUND | typeof M.LESSON_NOT_FOUND = M.NOT_FOUND,
    args?: Args
  ) {
    super({ message: key, errorKey: key, errorArgs: args })
  }
}

// Something the request points to does not exist (test sets, tests)
export class TestReferenceNotFoundException extends NotFoundException {
  constructor(key: typeof M.TESTSETS_NOT_FOUND | typeof M.TESTS_NOT_FOUND, args: Args) {
    super({ message: key, errorKey: key, errorArgs: args })
  }
}

// Only the creator may change or delete a test; a user needs a UserTest to take it
export class TestPermissionDeniedException extends ForbiddenException {
  constructor(
    key: typeof M.PERMISSION_DENIED | typeof M.NO_ACCESS = M.PERMISSION_DENIED
  ) {
    super({ message: key, errorKey: key })
  }
}

// A business rule about the test, its type or its test sets
export class TestRuleViolationException extends BadRequestException {
  constructor(key: string, args?: Args) {
    super({ message: key, errorKey: key, errorArgs: args })
  }
}

// Unexpected failure; `key` says what could not be done
export class InvalidTestDataException extends BadRequestException {
  constructor(key: string = M.INVALID_DATA) {
    super({ message: key, errorKey: key })
  }
}
