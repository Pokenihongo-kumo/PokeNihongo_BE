import { AnswerMessage } from '@/i18n/message-keys'
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common'

// A new instance per throw; `message` is translated from errorKey by
// ApiExceptionFilter (Accept-Language), the old Vietnamese text is the vi value

export class AnswerNotFoundException extends NotFoundException {
  constructor() {
    super({ message: AnswerMessage.NOT_FOUND, errorKey: AnswerMessage.NOT_FOUND })
  }
}

export class AnswerAlreadyExistsException extends ConflictException {
  constructor() {
    super({
      message: AnswerMessage.ALREADY_EXISTS,
      errorKey: AnswerMessage.ALREADY_EXISTS
    })
  }
}

// Same answerJp already in this question
export class AnswerContentAlreadyExistsException extends ConflictException {
  constructor() {
    super({
      message: AnswerMessage.CONTENT_ALREADY_EXISTS,
      errorKey: AnswerMessage.CONTENT_ALREADY_EXISTS
    })
  }
}

export class InvalidAnswerDataException extends BadRequestException {
  constructor() {
    super({ message: AnswerMessage.INVALID_DATA, errorKey: AnswerMessage.INVALID_DATA })
  }
}

export class QuestionNotFoundException extends NotFoundException {
  constructor() {
    super({
      message: AnswerMessage.QUESTION_NOT_FOUND,
      errorKey: AnswerMessage.QUESTION_NOT_FOUND
    })
  }
}

// Question-type rules (MATCHING: one answer, correct; others: at most 4, one correct)
export class AnswerRuleViolationException extends BadRequestException {
  constructor(rule: AnswerRule) {
    super({ message: rule, errorKey: rule })
  }
}

export type AnswerRule =
  | typeof AnswerMessage.MATCHING_SINGLE_ANSWER
  | typeof AnswerMessage.MATCHING_MUST_BE_CORRECT
  | typeof AnswerMessage.MAX_ANSWERS_REACHED
  | typeof AnswerMessage.CORRECT_ANSWER_EXISTS
