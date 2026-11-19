import { LessonMessage as M } from '@/i18n/message-keys'
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common'

// A new instance per throw; `message` is translated from errorKey by
// ApiExceptionFilter (Accept-Language), the old Vietnamese text is the vi value

export class LessonNotFoundException extends NotFoundException {
  constructor() {
    super({ message: M.NOT_FOUND, errorKey: M.NOT_FOUND })
  }
}

export class LessonAlreadyExistsException extends ConflictException {
  constructor() {
    super({ message: M.ALREADY_EXISTS, errorKey: M.ALREADY_EXISTS })
  }
}

export class InvalidLessonDataException extends BadRequestException {
  constructor() {
    super({ message: M.INVALID_DATA, errorKey: M.INVALID_DATA })
  }
}

export class LessonCategoryNotFoundException extends NotFoundException {
  constructor() {
    super({ message: M.CATEGORY_NOT_FOUND, errorKey: M.CATEGORY_NOT_FOUND })
  }
}

export class LessonRewardNotFoundException extends NotFoundException {
  constructor() {
    super({ message: M.REWARD_NOT_FOUND, errorKey: M.REWARD_NOT_FOUND })
  }
}

export class LessonTestNotFoundException extends NotFoundException {
  constructor() {
    super({ message: M.TEST_NOT_FOUND, errorKey: M.TEST_NOT_FOUND })
  }
}
