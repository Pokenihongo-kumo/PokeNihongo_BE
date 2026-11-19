import { ExercisesMessage as M } from '@/i18n/message-keys'
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common'

// A new instance per throw; `message` is translated from errorKey (and
// errorArgs) by ApiExceptionFilter, the old Vietnamese text is the vi value

export class ExercisesNotFoundException extends NotFoundException {
  constructor() {
    super({ message: M.NOT_FOUND, errorKey: M.NOT_FOUND })
  }
}

export class InvalidExercisesDataException extends BadRequestException {
  constructor() {
    super({ message: M.INVALID_DATA, errorKey: M.INVALID_DATA })
  }
}

export class LessonNotFoundException extends NotFoundException {
  constructor() {
    super({ message: M.LESSON_NOT_FOUND, errorKey: M.LESSON_NOT_FOUND })
  }
}

export class TestSetNotFoundException extends NotFoundException {
  constructor() {
    super({ message: M.TEST_SET_NOT_FOUND, errorKey: M.TEST_SET_NOT_FOUND })
  }
}

export class RewardNotFoundException extends NotFoundException {
  constructor() {
    super({ message: M.REWARD_NOT_FOUND, errorKey: M.REWARD_NOT_FOUND })
  }
}

// One exercise per test set
export class TestSetAlreadyHasExerciseException extends ConflictException {
  constructor() {
    super({ message: M.TEST_SET_HAS_EXERCISE, errorKey: M.TEST_SET_HAS_EXERCISE })
  }
}

// One exercise of each type per lesson
export class ExerciseTypePerLessonExistsException extends ConflictException {
  constructor() {
    super({ message: M.TYPE_EXISTS_IN_LESSON, errorKey: M.TYPE_EXISTS_IN_LESSON })
  }
}

// The exercise does not fit its lesson or test set
export class ExerciseRuleViolationException extends BadRequestException {
  constructor(rule: ExerciseRule, args?: Record<string, number>) {
    super({ message: rule, errorKey: rule, errorArgs: args })
  }
}

export type ExerciseRule =
  | typeof M.LEVEL_INCOMPATIBLE
  | typeof M.LIMIT_PER_LESSON
  | typeof M.TEST_SET_TYPE_MISMATCH
