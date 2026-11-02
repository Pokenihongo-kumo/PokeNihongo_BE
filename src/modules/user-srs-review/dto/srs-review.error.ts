import { SRS_MESSAGE } from '@/common/constants/message'
import { HttpException, HttpStatus } from '@nestjs/common'

export const ForbiddenSrsAccessException = new HttpException(
  {
    statusCode: HttpStatus.FORBIDDEN,
    message: SRS_MESSAGE.FORBIDDEN_ACCESS,
    error: 'FORBIDDEN_SRS_ACCESS'
  },
  HttpStatus.FORBIDDEN
)

export const SrsNotFoundException = new HttpException(
  {
    statusCode: HttpStatus.NOT_FOUND,
    message: SRS_MESSAGE.NOT_FOUND,
    error: 'SRS_NOT_FOUND'
  },
  HttpStatus.NOT_FOUND
)

export const InvalidSrsDataException = new HttpException(
  {
    statusCode: HttpStatus.BAD_REQUEST,
    message: SRS_MESSAGE.INVALID_DATA,
    error: 'INVALID_SRS_DATA'
  },
  HttpStatus.BAD_REQUEST
)
