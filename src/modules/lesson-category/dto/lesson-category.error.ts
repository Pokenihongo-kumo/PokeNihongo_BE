import { HttpException, HttpStatus } from '@nestjs/common'

export class LessonCategoryNotFoundException extends HttpException {
  constructor() {
    super(
      {
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Danh mục bài học không tồn tại',
        error: 'LESSON_CATEGORY_NOT_FOUND'
      },
      HttpStatus.NOT_FOUND
    )
  }
}

export class LessonCategoryAlreadyExistsException extends HttpException {
  constructor() {
    super(
      {
        statusCode: HttpStatus.CONFLICT,
        message: 'Danh mục bài học đã tồn tại',
        error: 'LESSON_CATEGORY_ALREADY_EXISTS'
      },
      HttpStatus.CONFLICT
    )
  }
}

export class InvalidLessonCategoryDataException extends HttpException {
  constructor(message: string) {
    super(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        message: `Dữ liệu danh mục bài học không hợp lệ: ${message}`,
        error: 'INVALID_LESSON_CATEGORY_DATA'
      },
      HttpStatus.BAD_REQUEST
    )
  }
}
