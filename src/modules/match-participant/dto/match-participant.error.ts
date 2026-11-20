import { MatchParticipantMessage } from '@/i18n/message-keys'
import { BadRequestException, NotFoundException } from '@nestjs/common'

export class MatchParticipantNotFoundException extends NotFoundException {
  constructor() {
    super({
      message: MatchParticipantMessage.NOT_FOUND,
      errorKey: MatchParticipantMessage.NOT_FOUND
    })
  }
}

export class MatchParticipantInvalidActionException extends BadRequestException {
  constructor() {
    super({
      message: MatchParticipantMessage.INVALID_ACTION,
      errorKey: MatchParticipantMessage.INVALID_ACTION
    })
  }
}
