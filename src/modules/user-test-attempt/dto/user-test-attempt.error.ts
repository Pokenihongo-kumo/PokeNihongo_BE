import { HttpException, HttpStatus } from '@nestjs/common'
import { USER_TEST_ATTEMPT_MESSAGE } from '@/common/constants/message'
import { UserTestAttemptMessage } from '@/i18n/message-keys'

export const UserTestAttemptNotFoundException = new HttpException(
  {
    statusCode: HttpStatus.NOT_FOUND,
    message: USER_TEST_ATTEMPT_MESSAGE.NOT_FOUND,
    error: 'USER_TEST_ATTEMPT_NOT_FOUND'
  },
  HttpStatus.NOT_FOUND
)

export const UserTestAttemptAlreadyExistsException = new HttpException(
  {
    statusCode: HttpStatus.CONFLICT,
    message: USER_TEST_ATTEMPT_MESSAGE.ALREADY_EXISTS,
    error: 'USER_TEST_ATTEMPT_ALREADY_EXISTS'
  },
  HttpStatus.CONFLICT
)

export const InvalidUserTestAttemptDataException = new HttpException(
  {
    statusCode: HttpStatus.BAD_REQUEST,
    message: USER_TEST_ATTEMPT_MESSAGE.INVALID_DATA,
    error: 'INVALID_USER_TEST_ATTEMPT_DATA'
  },
  HttpStatus.BAD_REQUEST
)

export const TestNotFoundException = new HttpException(
  {
    statusCode: HttpStatus.NOT_FOUND,
    message: USER_TEST_ATTEMPT_MESSAGE.TEST_NOT_FOUND,
    error: 'TEST_NOT_FOUND'
  },
  HttpStatus.NOT_FOUND
)

export const TestCompletedException = new HttpException(
  {
    statusCode: HttpStatus.CONFLICT,
    message: USER_TEST_ATTEMPT_MESSAGE.TEST_COMPLETED,
    error: 'TEST_COMPLETED'
  },
  HttpStatus.CONFLICT
)

export const TestAbandonedException = new HttpException(
  {
    statusCode: HttpStatus.CONFLICT,
    message: USER_TEST_ATTEMPT_MESSAGE.TEST_ABANDONED,
    error: 'TEST_ABANDONED'
  },
  HttpStatus.CONFLICT
)

export const ForbiddenReviewAccessException = new HttpException(
  {
    statusCode: HttpStatus.FORBIDDEN,
    message: USER_TEST_ATTEMPT_MESSAGE.FORBIDDEN_REVIEW_ACCESS,
    error: 'FORBIDDEN_REVIEW_ACCESS'
  },
  HttpStatus.FORBIDDEN
)

// Chỉ bỏ dở được attempt đang IN_PROGRESS
export const TestAttemptNotInProgressException = () =>
  new HttpException(
    {
      statusCode: HttpStatus.BAD_REQUEST,
      message: 'Chỉ có thể bỏ dở bài test đang trong trạng thái IN_PROGRESS',
      error: 'TEST_ATTEMPT_NOT_IN_PROGRESS'
    },
    HttpStatus.BAD_REQUEST
  )

// Chưa có lần COMPLETED và đúng < 80% → chưa được xem đáp án (message dịch theo Accept-Language)
export const ReviewInsufficientScoreException = () =>
  new HttpException(
    {
      statusCode: HttpStatus.FORBIDDEN,
      message: UserTestAttemptMessage.REVIEW_INSUFFICIENT_SCORE,
      errorKey: UserTestAttemptMessage.REVIEW_INSUFFICIENT_SCORE
    },
    HttpStatus.FORBIDDEN
  )

export const UnauthorizedUserTestAttemptAccessException = new HttpException(
  {
    statusCode: HttpStatus.FORBIDDEN,
    message: USER_TEST_ATTEMPT_MESSAGE.UNAUTHORIZED_ACCESS,
    error: 'UNAUTHORIZED_USER_TEST_ATTEMPT_ACCESS'
  },
  HttpStatus.FORBIDDEN
)
