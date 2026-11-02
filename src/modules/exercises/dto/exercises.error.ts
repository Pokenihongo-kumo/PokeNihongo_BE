import { BadRequestException, HttpException, HttpStatus } from '@nestjs/common'
import { EXERCISES_MESSAGE, REWARD_MESSAGE } from '@/common/constants/message'

export const ExercisesNotFoundException = new HttpException(
  {
    statusCode: HttpStatus.NOT_FOUND,
    message: EXERCISES_MESSAGE.NOT_FOUND,
    error: 'EXERCISES_NOT_FOUND'
  },
  HttpStatus.NOT_FOUND
)

export const ExercisesAlreadyExistsException = new HttpException(
  {
    statusCode: HttpStatus.CONFLICT,
    message: EXERCISES_MESSAGE.ALREADY_EXISTS,
    error: 'EXERCISES_ALREADY_EXISTS'
  },
  HttpStatus.CONFLICT
)

export const InvalidExercisesDataException = new HttpException(
  {
    statusCode: HttpStatus.BAD_REQUEST,
    message: EXERCISES_MESSAGE.INVALID_DATA,
    error: 'INVALID_EXERCISES_DATA'
  },
  HttpStatus.BAD_REQUEST
)

export const LessonNotFoundException = new HttpException(
  {
    statusCode: HttpStatus.NOT_FOUND,
    message: EXERCISES_MESSAGE.LESSON_NOT_FOUND,
    error: 'LESSON_NOT_FOUND'
  },
  HttpStatus.NOT_FOUND
)

export const RewardNotFoundException = new HttpException(
  {
    statusCode: HttpStatus.NOT_FOUND,
    message: REWARD_MESSAGE.NOT_FOUND,
    error: 'REWARD_NOT_FOUND'
  },
  HttpStatus.NOT_FOUND
)

export const LevelIncompatibleException = (
  lessonLevelJlpt: number,
  testSetLevelN: number
) =>
  new HttpException(
    {
      statusCode: HttpStatus.BAD_REQUEST,
      message: `Level không tương thích: Lesson có level JLPT ${lessonLevelJlpt} nhưng TestSet có level ${testSetLevelN}. Chỉ có thể tạo Exercise khi level của Lesson và TestSet khớp nhau`,
      error: 'LEVEL_INCOMPATIBLE'
    },
    HttpStatus.BAD_REQUEST
  )

export const ExerciseLimitPerLessonException = new HttpException(
  {
    statusCode: HttpStatus.BAD_REQUEST,
    message: 'Mỗi bài học chỉ được phép có tối đa 3 bài tập: VOCABULARY, GRAMMAR, KANJI',
    error: 'EXERCISE_LIMIT_PER_LESSON'
  },
  HttpStatus.BAD_REQUEST
)

export const ExerciseTypePerLessonExistsException = new HttpException(
  {
    statusCode: HttpStatus.CONFLICT,
    message: 'Mỗi loại bài tập chỉ được tạo 1 lần trong mỗi bài học',
    error: 'EXERCISE_TYPE_ALREADY_EXISTS'
  },
  HttpStatus.CONFLICT
)

export const TestSetTypeMismatchException = new HttpException(
  {
    statusCode: HttpStatus.BAD_REQUEST,
    message:
      'Loại TestSet không khớp với loại bài tập. Chỉ có thể gắn TestSet cùng loại (VOCABULARY/GRAMMAR/KANJI)',
    error: 'TESTSET_TYPE_MISMATCH'
  },
  HttpStatus.BAD_REQUEST
)

export const TestSetAlreadyHasExerciseException = new BadRequestException({
  statusCode: 400,
  message: 'TestSet này đã có exercise được gán. Mỗi testSet chỉ có thể có một exercise.',
  error: 'TESTSET_ALREADY_HAS_EXERCISE'
})
