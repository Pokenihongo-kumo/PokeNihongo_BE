import {
  UserExerciseAttemptMessage as EM,
  UserTestAttemptMessage as TM,
  UserTestMessage as UM
} from '@/i18n/message-keys'
import { UserExerciseAttemptController } from '@/modules/user-exercise-attempt/user-exercise-attempt.controller'
import { UserProgressController } from '@/modules/user-progress/user-progress.controller'
import { UserTestController } from '@/modules/user-test/user-test.controller'
import { UserTestAttemptController } from './user-test-attempt.controller'

// Completion, review and admin init routes answer with one of several
// messages. The services say what happened (outcome / completed); the
// controllers pick the message.
const i18n = {
  translate: (key: string, _lang: string, args?: object) =>
    args ? `${key} ${JSON.stringify(args)}` : key
}
const data = { any: 1 }

describe('outcome -> message', () => {
  it('exercise attempt: check / submit completion and review', async () => {
    const service = {
      checkExerciseCompletion: jest.fn(),
      submitExerciseCompletion: jest.fn(),
      getExerciseAttemptReview: jest.fn()
    }
    const controller = new UserExerciseAttemptController(service as never, i18n as never)
    const cases: [string, string][] = [
      ['not-all-answered', EM.NOT_ALL_ANSWERED],
      ['no-answer', EM.SUBMITTED_NO_ANSWER],
      ['incomplete', EM.SUBMITTED_INCOMPLETE],
      ['all-correct', EM.ALL_CORRECT],
      ['some-incorrect', EM.SOME_INCORRECT]
    ]
    for (const [outcome, message] of cases) {
      service.checkExerciseCompletion.mockResolvedValue({ outcome, data })
      service.submitExerciseCompletion.mockResolvedValue({ outcome, data })
      await expect(controller.checkCompletion({ id: 1 }, 7, 'en')).resolves.toEqual({
        message,
        data
      })
      await expect(
        controller.submitCompletion({ id: 1 }, 7, { time: 30 } as never, 'en')
      ).resolves.toEqual({ message, data })
    }
    expect(service.submitExerciseCompletion).toHaveBeenCalledWith(1, 7, 30)

    for (const [completed, message] of [
      [true, EM.REVIEW_SUCCESS],
      [false, EM.REVIEW_NOT_COMPLETED]
    ] as const) {
      service.getExerciseAttemptReview.mockResolvedValue({ completed, data })
      await expect(
        controller.getExerciseAttemptReview({ id: 1 }, 7, 'en')
      ).resolves.toEqual({ message, data })
    }
  })

  it('test attempt: check / submit completion and both reviews', async () => {
    const service = {
      checkTestCompletion: jest.fn(),
      submitTestCompletion: jest.fn(),
      getTestAttemptReview: jest.fn(),
      getLessonTestAttemptReview: jest.fn()
    }
    const controller = new UserTestAttemptController(service as never, i18n as never)
    const cases: [string, string][] = [
      ['not-enough-answers', TM.NOT_ENOUGH_ANSWERS],
      ['no-answer', TM.SUBMITTED_NO_ANSWER],
      ['incomplete', TM.SUBMITTED_INCOMPLETE],
      ['all-correct', TM.TEST_COMPLETED_ALL_CORRECT],
      ['some-wrong', TM.TEST_COMPLETED_SOME_WRONG],
      ['review-passed', TM.LESSON_REVIEW_PASSED],
      ['review-failed', TM.LESSON_REVIEW_FAILED]
    ]
    for (const [outcome, message] of cases) {
      service.checkTestCompletion.mockResolvedValue({ outcome, data })
      service.submitTestCompletion.mockResolvedValue({ outcome, data })
      await expect(controller.checkCompletion({ id: 1 }, 7, 'en')).resolves.toEqual({
        message,
        data
      })
      await expect(
        controller.submitCompletion({ id: 1 }, 7, { time: 30 } as never, 'en')
      ).resolves.toEqual({ message, data })
    }
    expect(service.submitTestCompletion).toHaveBeenCalledWith(1, 7, 30)

    for (const [completed, message] of [
      [true, TM.REVIEW_SUCCESS],
      [false, TM.REVIEW_NOT_COMPLETED]
    ] as const) {
      service.getTestAttemptReview.mockResolvedValue({ completed, data })
      service.getLessonTestAttemptReview.mockResolvedValue({ completed, data })
      await expect(controller.getTestAttemptReview({ id: 1 }, 7, 'en')).resolves.toEqual({
        message,
        data
      })
      await expect(
        controller.getLessonTestAttemptReview({ id: 1 }, 7, 'en')
      ).resolves.toEqual({ message, data })
    }
  })

  it('admin init: user tests and user progress', async () => {
    const userTestService = { initAllUsersTests: jest.fn() }
    const userTests = new UserTestController(userTestService as never, i18n as never)
    userTestService.initAllUsersTests.mockResolvedValue({ outcome: 'no-users', data })
    await expect(userTests.initAllUsersTests('en')).resolves.toEqual({
      message: UM.INIT_ALL_NO_USERS,
      data
    })
    userTestService.initAllUsersTests.mockResolvedValue({ outcome: 'no-tests', data })
    await expect(userTests.initAllUsersTests('en')).resolves.toEqual({
      message: UM.INIT_ALL_NO_TESTS,
      data
    })
    const done = { totalUsers: 2, totalTests: 3, totalUserTests: 6 }
    userTestService.initAllUsersTests.mockResolvedValue({ outcome: 'done', data: done })
    await expect(userTests.initAllUsersTests('en')).resolves.toEqual({
      message: `${UM.INIT_ALL_SUCCESS} {"tests":3,"users":2}`,
      data: done
    })

    const progressService = {
      initUserProgressForAdmin: jest.fn(),
      initAllUsersProgress: jest.fn()
    }
    const progress = new UserProgressController(progressService as never, i18n as never)
    const one: [string, string][] = [
      ['no-lessons', 'Không có lesson nào trong hệ thống'],
      ['done', 'Khởi tạo UserProgress thành công']
    ]
    for (const [outcome, message] of one) {
      progressService.initUserProgressForAdmin.mockResolvedValue({ outcome, data })
      await expect(progress.initUserProgressForAdmin({ userId: 5 })).resolves.toEqual({
        message,
        data
      })
    }
    const all: [string, string][] = [
      ['no-users', 'Không có user nào trong hệ thống'],
      ['no-lessons', 'Không có lesson nào trong hệ thống'],
      ['done', 'Khởi tạo UserProgress cho tất cả user thành công']
    ]
    for (const [outcome, message] of all) {
      progressService.initAllUsersProgress.mockResolvedValue({ outcome, data })
      await expect(progress.initAllUsersProgress()).resolves.toEqual({ message, data })
    }
  })
})
