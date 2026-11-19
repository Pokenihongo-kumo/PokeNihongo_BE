import { LessonCategoryMessage } from '@/i18n/message-keys'
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common'

// A new instance per throw; `message` is translated from errorKey by
// ApiExceptionFilter (Accept-Language), the old Vietnamese text is the vi value

export class LessonCategoryNotFoundException extends NotFoundException {
  constructor() {
    super({
      message: LessonCategoryMessage.NOT_FOUND,
      errorKey: LessonCategoryMessage.NOT_FOUND
    })
  }
}

export class LessonCategoryAlreadyExistsException extends ConflictException {
  constructor() {
    super({
      message: LessonCategoryMessage.ALREADY_EXISTS,
      errorKey: LessonCategoryMessage.ALREADY_EXISTS
    })
  }
}

export class InvalidLessonCategoryDataException extends BadRequestException {
  constructor() {
    super({
      message: LessonCategoryMessage.INVALID_DATA,
      errorKey: LessonCategoryMessage.INVALID_DATA
    })
  }
}
