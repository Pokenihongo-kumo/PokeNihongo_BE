import { SrsReviewMessage as M } from '@/i18n/message-keys'
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException
} from '@nestjs/common'

// A new instance per throw; `message` is translated from errorKey by
// ApiExceptionFilter (Accept-Language), the old Vietnamese text is the vi value

export class SrsNotFoundException extends NotFoundException {
  constructor() {
    super({ message: M.NOT_FOUND, errorKey: M.NOT_FOUND })
  }
}

// The review belongs to another user
export class ForbiddenSrsAccessException extends ForbiddenException {
  constructor() {
    super({ message: M.FORBIDDEN, errorKey: M.FORBIDDEN })
  }
}

export class InvalidSrsDataException extends BadRequestException {
  constructor() {
    super({ message: M.INVALID_DATA, errorKey: M.INVALID_DATA })
  }
}
