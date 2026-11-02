import { HttpException, HttpStatus } from '@nestjs/common'

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

export class LessonAlreadyExistsException extends HttpException {
  constructor() {
    super(
      {
        statusCode: HttpStatus.CONFLICT,
        message: 'Bài học đã tồn tại',
        error: 'LESSON_ALREADY_EXISTS'
      },
      HttpStatus.CONFLICT
    )
  }
}

export class InvalidLessonDataException extends HttpException {
  constructor(message: string) {
    super(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        message: `Dữ liệu bài học không hợp lệ: ${message}`,
        error: 'INVALID_LESSON_DATA'
      },
      HttpStatus.BAD_REQUEST
    )
  }
}

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

export class LessonContentsNotFoundException extends HttpException {
  constructor() {
    super(
      {
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Nội dung bài học không tồn tại',
        error: 'LESSON_CONTENTS_NOT_FOUND'
      },
      HttpStatus.NOT_FOUND
    )
  }
}

export class LessonContentsAlreadyExistsException extends HttpException {
  constructor() {
    super(
      {
        statusCode: HttpStatus.CONFLICT,
        message: 'Nội dung bài học đã tồn tại',
        error: 'LESSON_CONTENTS_ALREADY_EXISTS'
      },
      HttpStatus.CONFLICT
    )
  }
}

export class InvalidLessonContentsDataException extends HttpException {
  constructor(message: string) {
    super(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        message: `Dữ liệu nội dung bài học không hợp lệ: ${message}`,
        error: 'INVALID_LESSON_CONTENTS_DATA'
      },
      HttpStatus.BAD_REQUEST
    )
  }
}

export class RewardNotFoundException extends HttpException {
  constructor() {
    super(
      {
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Phần thưởng không tồn tại',
        error: 'REWARD_NOT_FOUND'
      },
      HttpStatus.NOT_FOUND
    )
  }
}
