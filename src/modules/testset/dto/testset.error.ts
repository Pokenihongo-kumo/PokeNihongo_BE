import { HttpException, HttpStatus } from '@nestjs/common'

export class TestSetNotFoundException extends HttpException {
  constructor() {
    super('Không tìm thấy bộ đề', HttpStatus.NOT_FOUND)
  }
}

export class TestSetPermissionDeniedException extends HttpException {
  constructor() {
    super('Bạn không có quyền thực hiện hành động này', HttpStatus.FORBIDDEN)
  }
}

export class TestSetAlreadyExistsException extends HttpException {
  constructor() {
    super('Bộ đề đã tồn tại', HttpStatus.CONFLICT)
  }
}

export class TestSetInvalidDataException extends HttpException {
  constructor(message: string) {
    super(`Dữ liệu không hợp lệ: ${message}`, HttpStatus.BAD_REQUEST)
  }
}

export class TestSetCannotChangeTestTypeException extends HttpException {
  constructor(message: string) {
    super(message, HttpStatus.BAD_REQUEST)
  }
}
