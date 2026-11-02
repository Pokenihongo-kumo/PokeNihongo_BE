import { HttpException, HttpStatus } from '@nestjs/common'
import { USER_TEST_ANSWER_LOG_MESSAGE } from '@/common/constants/message'

export const USER_TEST_ANSWER_LOG_MESSAGE_CONST = USER_TEST_ANSWER_LOG_MESSAGE

export const UserTestAnswerLogNotFoundException = new HttpException(
  {
    statusCode: HttpStatus.NOT_FOUND,
    message: USER_TEST_ANSWER_LOG_MESSAGE.NOT_FOUND,
    error: 'USER_TEST_ANSWER_LOG_NOT_FOUND'
  },
  HttpStatus.NOT_FOUND
)

export const UserTestAnswerLogAlreadyExistsException = new HttpException(
  {
    statusCode: HttpStatus.CONFLICT,
    message: USER_TEST_ANSWER_LOG_MESSAGE.ALREADY_EXISTS,
    error: 'USER_TEST_ANSWER_LOG_ALREADY_EXISTS'
  },
  HttpStatus.CONFLICT
)

export const InvalidUserTestAnswerLogDataException = new HttpException(
  {
    statusCode: HttpStatus.BAD_REQUEST,
    message: USER_TEST_ANSWER_LOG_MESSAGE.INVALID_DATA,
    error: 'INVALID_USER_TEST_ANSWER_LOG_DATA'
  },
  HttpStatus.BAD_REQUEST
)
