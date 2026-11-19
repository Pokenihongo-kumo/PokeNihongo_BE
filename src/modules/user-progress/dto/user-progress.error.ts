import { UserProgressMessage as M } from '@/i18n/message-keys'
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common'

// A new instance per throw; `message` is translated from errorKey by
// ApiExceptionFilter (Accept-Language), the old Vietnamese text is the vi value

export class UserProgressNotFoundException extends NotFoundException {
  constructor() {
    super({ message: M.NOT_FOUND, errorKey: M.NOT_FOUND })
  }
}

export class UserProgressAlreadyExistsException extends ConflictException {
  constructor() {
    super({ message: M.ALREADY_EXISTS, errorKey: M.ALREADY_EXISTS })
  }
}

export class InvalidUserProgressDataException extends BadRequestException {
  constructor() {
    super({ message: M.INVALID_DATA, errorKey: M.INVALID_DATA })
  }
}
