import { UserExerciseAttemptMessage as M } from '@/i18n/message-keys'
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException
} from '@nestjs/common'

// A new instance per throw; `message` is translated from errorKey by
// ApiExceptionFilter (Accept-Language), the old Vietnamese text is the vi value

export class UserExerciseAttemptNotFoundException extends NotFoundException {
  constructor() {
    super({ message: M.NOT_FOUND, errorKey: M.NOT_FOUND })
  }
}

// The attempt belongs to another user (was a 500 from new Error('Unauthorized'))
export class AttemptNotOwnedException extends ForbiddenException {
  constructor() {
    super({ message: M.NOT_OWNED, errorKey: M.NOT_OWNED })
  }
}

// The user is on another lesson
export class LessonBlockedException extends BadRequestException {
  constructor() {
    super({ message: M.LESSON_BLOCKED, errorKey: M.LESSON_BLOCKED })
  }
}

// The lesson before this one is not started yet
export class LessonPrerequisiteNotMetException extends BadRequestException {
  constructor(previousLessonId: number, lessonId: number) {
    super({
      message: M.LESSON_PREREQUISITE_NOT_MET,
      errorKey: M.LESSON_PREREQUISITE_NOT_MET,
      errorArgs: { previousLessonId, lessonId }
    })
  }
}

// Only an attempt in progress can be abandoned
export class ExerciseAttemptNotInProgressException extends BadRequestException {
  constructor() {
    super({ message: M.NOT_IN_PROGRESS, errorKey: M.NOT_IN_PROGRESS })
  }
}

// The exercise has no questions to check (was a 500 from new Error)
export class ExerciseHasNoTestSetException extends BadRequestException {
  constructor() {
    super({ message: M.EXERCISE_HAS_NO_TEST_SET, errorKey: M.EXERCISE_HAS_NO_TEST_SET })
  }
}

// Nothing completed yet and less than 80% right: no answers to see
export class ReviewInsufficientScoreException extends ForbiddenException {
  constructor() {
    super({
      message: M.REVIEW_INSUFFICIENT_SCORE,
      errorKey: M.REVIEW_INSUFFICIENT_SCORE
    })
  }
}

export class InvalidUserExerciseAttemptDataException extends BadRequestException {
  constructor() {
    super({ message: M.INVALID_DATA, errorKey: M.INVALID_DATA })
  }
}
