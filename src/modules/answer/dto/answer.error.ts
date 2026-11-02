import { HttpException, HttpStatus } from '@nestjs/common'

export class AnswerNotFoundException extends HttpException {
  constructor() {
    super('Không tìm thấy câu trả lời', HttpStatus.NOT_FOUND)
  }
}

export class AnswerAlreadyExistsException extends HttpException {
  constructor() {
    super('Câu trả lời đã tồn tại', HttpStatus.CONFLICT)
  }
}

export class InvalidAnswerDataException extends HttpException {
  constructor(message: string) {
    super(message, HttpStatus.BAD_REQUEST)
  }
}

export class QuestionNotFoundException extends HttpException {
  constructor() {
    super('Không tìm thấy câu hỏi', HttpStatus.NOT_FOUND)
  }
}

export class AnswerContentAlreadyExistsException extends HttpException {
  constructor() {
    super('Câu trả lời này đã tồn tại trong câu hỏi', HttpStatus.CONFLICT)
  }
}

export class InvalidJapaneseContentException extends HttpException {
  constructor() {
    super(
      'Câu trả lời phải chứa ít nhất một ký tự tiếng Nhật (Hiragana, Katakana, hoặc Kanji)',
      HttpStatus.BAD_REQUEST
    )
  }
}
