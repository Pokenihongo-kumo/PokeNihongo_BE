import { UserMessage } from '@/i18n/message-keys'
import { BadRequestException, NotFoundException } from '@nestjs/common'

export class UserNotFoundException extends NotFoundException {
  constructor() {
    super({
      message: UserMessage.NOT_FOUND,
      errorKey: UserMessage.NOT_FOUND
    })
  }
}

export class EmailAlreadyExistsException extends BadRequestException {
  constructor() {
    super({
      message: UserMessage.EMAIL_ALREADY_EXISTS,
      errorKey: UserMessage.EMAIL_ALREADY_EXISTS
    })
  }
}

export class UserHasNotBeenJoinedSeasonException extends BadRequestException {
  constructor() {
    super({
      message: UserMessage.HAS_NOT_JOINED_SEASON,
      errorKey: UserMessage.HAS_NOT_JOINED_SEASON
    })
  }
}
