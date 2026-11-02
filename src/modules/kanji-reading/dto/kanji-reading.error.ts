import { HttpException, HttpStatus } from '@nestjs/common'

export const KanjiReadingNotFoundException = new HttpException(
  {
    statusCode: HttpStatus.NOT_FOUND,
    message: 'Cách đọc Kanji không tồn tại',
    error: 'KANJI_READING_NOT_FOUND'
  },
  HttpStatus.NOT_FOUND
)

export const KanjiReadingAlreadyExistsException = new HttpException(
  {
    statusCode: HttpStatus.CONFLICT,
    message: 'Cách đọc Kanji đã tồn tại',
    error: 'KANJI_READING_ALREADY_EXISTS'
  },
  HttpStatus.CONFLICT
)

export const InvalidKanjiReadingDataException = new HttpException(
  {
    statusCode: HttpStatus.BAD_REQUEST,
    message: 'Dữ liệu cách đọc Kanji không hợp lệ',
    error: 'INVALID_KANJI_READING_DATA'
  },
  HttpStatus.BAD_REQUEST
)
