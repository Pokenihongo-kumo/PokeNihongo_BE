import { RoundQuestionMessage } from '@/i18n/message-keys'
import { ConflictException, NotFoundException } from '@nestjs/common'

export class RoundQuestionNotFoundException extends NotFoundException {
  constructor() {
    super({
      message: RoundQuestionMessage.NOT_FOUND,
      errorKey: RoundQuestionMessage.NOT_FOUND
    })
  }
}

// One answer per question: a second one (even after the round) used to
// overwrite the first
export class RoundQuestionAlreadyAnsweredException extends ConflictException {
  constructor() {
    super({
      message: RoundQuestionMessage.ALREADY_ANSWERED,
      errorKey: RoundQuestionMessage.ALREADY_ANSWERED
    })
  }
}
