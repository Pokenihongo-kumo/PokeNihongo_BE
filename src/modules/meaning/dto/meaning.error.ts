import { HttpException, HttpStatus } from '@nestjs/common'

export const MeaningNotFoundException = new HttpException(
  {
    statusCode: HttpStatus.NOT_FOUND,
    message: 'Nghĩa không tồn tại',
    error: 'MEANING_NOT_FOUND'
  },
  HttpStatus.NOT_FOUND
)

export const MeaningAlreadyExistsException = new HttpException(
  {
    statusCode: HttpStatus.CONFLICT,
    message: 'Nghĩa đã tồn tại',
    error: 'MEANING_ALREADY_EXISTS'
  },
  HttpStatus.CONFLICT
)

export const InvalidMeaningDataException = new HttpException(
  {
    statusCode: HttpStatus.BAD_REQUEST,
    message: 'Dữ liệu nghĩa không hợp lệ',
    error: 'INVALID_MEANING_DATA'
  },
  HttpStatus.BAD_REQUEST
)
