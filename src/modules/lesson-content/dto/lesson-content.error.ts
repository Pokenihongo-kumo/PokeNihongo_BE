import { HttpException, HttpStatus, BadRequestException } from '@nestjs/common'

export class LessonContentNotFoundException extends HttpException {
  constructor() {
    super(
      {
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Nội dung bài học không tồn tại',
        error: 'LESSON_CONTENT_NOT_FOUND'
      },
      HttpStatus.NOT_FOUND
    )
  }
}

export class LessonContentAlreadyExistsException extends HttpException {
  constructor() {
    super(
      {
        statusCode: HttpStatus.CONFLICT,
        message: 'Nội dung bài học đã tồn tại',
        error: 'LESSON_CONTENT_ALREADY_EXISTS'
      },
      HttpStatus.CONFLICT
    )
  }
}

export class ContentAlreadyExistsInLessonException extends BadRequestException {
  constructor(contentIds: string, contentType: string, lessonId: number) {
    super(`${contentType} đã tồn tại trong lesson ${lessonId} là ${contentIds}`)
  }
}

export class InvalidLessonContentDataException extends HttpException {
  constructor(message: string) {
    super(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        message: `Dữ liệu nội dung bài học không hợp lệ: ${message}`,
        error: 'INVALID_LESSON_CONTENT_DATA'
      },
      HttpStatus.BAD_REQUEST
    )
  }
}

export class LessonNotFoundException extends HttpException {
  constructor() {
    super(
      {
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Bài học không tồn tại',
        error: 'LESSON_NOT_FOUND'
      },
      HttpStatus.NOT_FOUND
    )
  }
}
