import { HttpException, HttpStatus } from '@nestjs/common'

export class GrammarNotFoundException extends HttpException {
  constructor() {
    super(
      {
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Ngữ pháp không tồn tại',
        error: 'GRAMMAR_NOT_FOUND'
      },
      HttpStatus.NOT_FOUND
    )
  }
}

export class GrammarAlreadyExistsException extends HttpException {
  constructor() {
    super(
      {
        statusCode: HttpStatus.CONFLICT,
        message: 'Ngữ pháp đã tồn tại',
        error: 'GRAMMAR_ALREADY_EXISTS'
      },
      HttpStatus.CONFLICT
    )
  }
}

export class InvalidGrammarDataException extends HttpException {
  constructor(message: string) {
    super(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        message: `Dữ liệu ngữ pháp không hợp lệ: ${message}`,
        error: 'INVALID_GRAMMAR_DATA'
      },
      HttpStatus.BAD_REQUEST
    )
  }
}
