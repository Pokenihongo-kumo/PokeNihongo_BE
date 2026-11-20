import { RoundQuestionsAnswerLogMessage } from '@/i18n/message-keys'
import { NotFoundException } from '@nestjs/common'

export class RoundQuestionsAnswerLogNotFoundException extends NotFoundException {
  constructor() {
    super({
      message: RoundQuestionsAnswerLogMessage.NOT_FOUND,
      errorKey: RoundQuestionsAnswerLogMessage.NOT_FOUND
    })
  }
}
