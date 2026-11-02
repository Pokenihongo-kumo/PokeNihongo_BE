import { HttpException, HttpStatus } from '@nestjs/common'

export const LanguagesNotFoundException = new HttpException(
  {
    statusCode: HttpStatus.NOT_FOUND,
    message: 'Ngôn ngữ không tồn tại',
    error: 'LANGUAGES_NOT_FOUND'
  },
  HttpStatus.NOT_FOUND
)

export const LanguagesAlreadyExistsException = new HttpException(
  {
    statusCode: HttpStatus.CONFLICT,
    message: 'Ngôn ngữ đã tồn tại',
    error: 'LANGUAGES_ALREADY_EXISTS'
  },
  HttpStatus.CONFLICT
)

export const InvalidLanguagesDataException = new HttpException(
  {
    statusCode: HttpStatus.BAD_REQUEST,
    message: 'Dữ liệu ngôn ngữ không hợp lệ',
    error: 'INVALID_LANGUAGES_DATA'
  },
  HttpStatus.BAD_REQUEST
)

export const LanguageCodeAlreadyExistsException = new HttpException(
  {
    statusCode: HttpStatus.CONFLICT,
    message: 'Mã ngôn ngữ đã tồn tại',
    error: 'LANGUAGE_CODE_ALREADY_EXISTS'
  },
  HttpStatus.CONFLICT
)
