import { HttpException, HttpStatus } from '@nestjs/common'

export const WordTypeNotFoundException = new HttpException(
  {
    statusCode: HttpStatus.NOT_FOUND,
    message: 'Loại từ không tồn tại',
    error: 'WORD_TYPE_NOT_FOUND'
  },
  HttpStatus.NOT_FOUND
)

export const WordTypeAlreadyExistsException = new HttpException(
  {
    statusCode: HttpStatus.CONFLICT,
    message: 'Loại từ đã tồn tại',
    error: 'WORD_TYPE_ALREADY_EXISTS'
  },
  HttpStatus.CONFLICT
)

export const InvalidWordTypeDataException = new HttpException(
  {
    statusCode: HttpStatus.BAD_REQUEST,
    message: 'Dữ liệu loại từ không hợp lệ',
    error: 'INVALID_WORD_TYPE_DATA'
  },
  HttpStatus.BAD_REQUEST
)
