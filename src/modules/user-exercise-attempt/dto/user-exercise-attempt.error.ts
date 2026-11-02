import { HttpException, HttpStatus } from '@nestjs/common'
import { USER_EXERCISE_ATTEMPT_MESSAGE } from '@/common/constants/message'
import { UserExerciseAttemptMessage } from '@/i18n/message-keys'

export const UserExerciseAttemptNotFoundException = new HttpException(
  {
    statusCode: HttpStatus.NOT_FOUND,
    message: USER_EXERCISE_ATTEMPT_MESSAGE.NOT_FOUND,
    error: 'USER_EXERCISE_ATTEMPT_NOT_FOUND'
  },
  HttpStatus.NOT_FOUND
)

export const UserExerciseAttemptAlreadyExistsException = new HttpException(
  {
    statusCode: HttpStatus.CONFLICT,
    message: USER_EXERCISE_ATTEMPT_MESSAGE.ALREADY_EXISTS,
    error: 'USER_EXERCISE_ATTEMPT_ALREADY_EXISTS'
  },
  HttpStatus.CONFLICT
)

export const InvalidUserExerciseAttemptDataException = new HttpException(
  {
    statusCode: HttpStatus.BAD_REQUEST,
    message: USER_EXERCISE_ATTEMPT_MESSAGE.INVALID_DATA,
    error: 'INVALID_USER_EXERCISE_ATTEMPT_DATA'
  },
  HttpStatus.BAD_REQUEST
)

export const ExerciseNotFoundException = new HttpException(
  {
    statusCode: HttpStatus.NOT_FOUND,
    message: USER_EXERCISE_ATTEMPT_MESSAGE.EXERCISE_NOT_FOUND,
    error: 'EXERCISE_NOT_FOUND'
  },
  HttpStatus.NOT_FOUND
)

export const LessonBlockedException = new HttpException(
  {
    statusCode: HttpStatus.BAD_REQUEST,
    message: USER_EXERCISE_ATTEMPT_MESSAGE.LESSON_BLOCKED,
    error: 'LESSON_BLOCKED'
  },
  HttpStatus.BAD_REQUEST
)

// Dynamic prerequisite error with lesson ids
export const LessonPrerequisiteNotMetException = (
  previousLessonId: number,
  lessonId: number
) =>
  new HttpException(
    {
      statusCode: HttpStatus.BAD_REQUEST,
      message: `Bạn cần bắt đầu bài ${previousLessonId} trước khi vào bài ${lessonId}.`,
      error: 'LESSON_PREREQUISITE_NOT_MET'
    },
    HttpStatus.BAD_REQUEST
  )

export const ExerciseAlreadyCompletedException = new HttpException(
  {
    statusCode: HttpStatus.CONFLICT,
    message: USER_EXERCISE_ATTEMPT_MESSAGE.EXERCISE_COMPLETED,
    error: 'EXERCISE_ALREADY_COMPLETED'
  },
  HttpStatus.CONFLICT
)

export const ExerciseAbandonedException = new HttpException(
  {
    statusCode: HttpStatus.CONFLICT,
    message: USER_EXERCISE_ATTEMPT_MESSAGE.EXERCISE_ABANDONED,
    error: 'EXERCISE_ABANDONED'
  },
  HttpStatus.CONFLICT
)

export const ForbiddenReviewAccessException = new HttpException(
  {
    statusCode: HttpStatus.FORBIDDEN,
    message: USER_EXERCISE_ATTEMPT_MESSAGE.FORBIDDEN_REVIEW_ACCESS,
    error: 'FORBIDDEN_REVIEW_ACCESS'
  },
  HttpStatus.FORBIDDEN
)

// Chỉ bỏ dở được attempt đang IN_PROGRESS
export const ExerciseAttemptNotInProgressException = () =>
  new HttpException(
    {
      statusCode: HttpStatus.BAD_REQUEST,
      message: 'Chỉ có thể bỏ dở bài tập đang trong trạng thái IN_PROGRESS',
      error: 'EXERCISE_ATTEMPT_NOT_IN_PROGRESS'
    },
    HttpStatus.BAD_REQUEST
  )

// Chưa có lần COMPLETED và đúng < 80% → chưa được xem đáp án (message dịch theo Accept-Language)
export const ReviewInsufficientScoreException = () =>
  new HttpException(
    {
      statusCode: HttpStatus.FORBIDDEN,
      message: UserExerciseAttemptMessage.REVIEW_INSUFFICIENT_SCORE,
      errorKey: UserExerciseAttemptMessage.REVIEW_INSUFFICIENT_SCORE
    },
    HttpStatus.FORBIDDEN
  )
