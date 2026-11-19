import { UserTestMessage as M } from '@/i18n/message-keys'
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common'

// A new instance per throw; `message` is translated from errorKey by
// ApiExceptionFilter (Accept-Language)

// Was a 500 from new Error('UserTest không tồn tại')
export class UserTestNotFoundException extends NotFoundException {
  constructor() {
    super({ message: M.NOT_FOUND, errorKey: M.NOT_FOUND })
  }
}

// Was a 500 from new Error('UserTest đã tồn tại')
export class UserTestAlreadyExistsException extends ConflictException {
  constructor() {
    super({ message: M.ALREADY_EXISTS, errorKey: M.ALREADY_EXISTS })
  }
}

export class InvalidUserTestDataException extends BadRequestException {
  constructor() {
    super({ message: M.INVALID_DATA, errorKey: M.INVALID_DATA })
  }
}
