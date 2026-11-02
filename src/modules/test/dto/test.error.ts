import { HttpException, HttpStatus } from '@nestjs/common'

export class TestNotFoundException extends HttpException {
  constructor() {
    super('Không tìm thấy bài test', HttpStatus.NOT_FOUND)
  }
}

export class TestPermissionDeniedException extends HttpException {
  constructor() {
    super('Bạn không có quyền thực hiện hành động này', HttpStatus.FORBIDDEN)
  }
}

export class TestAlreadyExistsException extends HttpException {
  constructor() {
    super('Bài test đã tồn tại', HttpStatus.CONFLICT)
  }
}

export class TestInvalidDataException extends HttpException {
  constructor(message: string) {
    super(`Dữ liệu không hợp lệ: ${message}`, HttpStatus.BAD_REQUEST)
  }
}
