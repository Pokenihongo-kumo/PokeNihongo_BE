import { HttpException, HttpStatus } from '@nestjs/common'

export class GrammarUsageNotFoundException extends HttpException {
  constructor() {
    super(
      {
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Cách sử dụng ngữ pháp không tồn tại',
        error: 'GRAMMAR_USAGE_NOT_FOUND'
      },
      HttpStatus.NOT_FOUND
    )
  }
}

export class GrammarUsageAlreadyExistsException extends HttpException {
  constructor() {
    super(
      {
        statusCode: HttpStatus.CONFLICT,
        message: 'Cách sử dụng ngữ pháp đã tồn tại',
        error: 'GRAMMAR_USAGE_ALREADY_EXISTS'
      },
      HttpStatus.CONFLICT
    )
  }
}

export class InvalidGrammarUsageDataException extends HttpException {
  constructor(message: string) {
    super(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        message: `Dữ liệu cách sử dụng ngữ pháp không hợp lệ: ${message}`,
        error: 'INVALID_GRAMMAR_USAGE_DATA'
      },
      HttpStatus.BAD_REQUEST
    )
  }
}

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
