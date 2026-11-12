import { HttpStatus } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { ExercisesService } from './exercises.service'

describe('ExercisesService', () => {
  const repo = {
    ruleContext: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    countRewards: jest.fn(),
    getLessonRewardIds: jest.fn()
  }
  const service = new ExercisesService(
    repo as never,
    {} as never,
    {} as never,
    {
      translate: (k: string, _l: string, args?: object) =>
        args ? `${k} ${JSON.stringify(args)}` : k
    } as never
  )
  const body = {
    exerciseType: 'VOCABULARY' as const,
    lessonId: 3,
    testSetId: 8,
    isBlocked: false,
    rewardId: []
  }

  beforeEach(() => {
    jest.resetAllMocks()
    repo.ruleContext.mockResolvedValue({
      lesson: { levelJlpt: 5 },
      testSet: { levelN: 5, testType: 'VOCABULARY' },
      otherTypes: []
    })
    repo.create.mockImplementation(async (data) => ({ id: 1, ...data }))
    repo.update.mockImplementation(async (id, data) => ({ id, ...data }))
  })

  const rejects = (promise: Promise<unknown>) => expect(promise).rejects

  it('lesson and test set must exist (a missing test set was a 400)', async () => {
    repo.ruleContext.mockResolvedValueOnce({
      lesson: null,
      testSet: null,
      otherTypes: []
    })
    await rejects(service.create(body)).toMatchObject({
      status: HttpStatus.NOT_FOUND,
      response: { errorKey: 'exercises.LESSON_NOT_FOUND' }
    })
    repo.ruleContext.mockResolvedValueOnce({
      lesson: { levelJlpt: 5 },
      testSet: null,
      otherTypes: []
    })
    await rejects(service.create(body)).toMatchObject({
      status: HttpStatus.NOT_FOUND,
      response: { errorKey: 'exercises.TEST_SET_NOT_FOUND' }
    })
  })

  it('level, room in the lesson, one per type, matching test set type', async () => {
    repo.ruleContext.mockResolvedValueOnce({
      lesson: { levelJlpt: 4 },
      testSet: { levelN: 5, testType: 'VOCABULARY' },
      otherTypes: []
    })
    await rejects(service.create(body)).toMatchObject({
      response: {
        errorKey: 'exercises.LEVEL_INCOMPATIBLE',
        errorArgs: { lessonLevel: 4, testSetLevel: 5 }
      }
    })
    repo.ruleContext.mockResolvedValueOnce({
      lesson: { levelJlpt: 5 },
      testSet: null,
      otherTypes: ['VOCABULARY', 'GRAMMAR', 'KANJI']
    })
    await rejects(service.create({ ...body, testSetId: undefined })).toMatchObject({
      response: { errorKey: 'exercises.LIMIT_PER_LESSON' }
    })
    repo.ruleContext.mockResolvedValueOnce({
      lesson: { levelJlpt: 5 },
      testSet: null,
      otherTypes: ['VOCABULARY']
    })
    await rejects(service.create({ ...body, testSetId: undefined })).toMatchObject({
      status: HttpStatus.CONFLICT,
      response: { errorKey: 'exercises.TYPE_EXISTS_IN_LESSON' }
    })
    await rejects(service.create({ ...body, exerciseType: 'KANJI' })).toMatchObject({
      response: { errorKey: 'exercises.TEST_SET_TYPE_MISMATCH' }
    })
    expect(repo.create).not.toHaveBeenCalled()
  })

  it('update to another lesson checks the rules without counting itself (was unchecked)', async () => {
    repo.findById.mockResolvedValue({
      id: 9,
      lessonId: 3,
      testSetId: 8,
      exerciseType: 'VOCABULARY'
    })
    repo.ruleContext.mockResolvedValueOnce({
      lesson: { levelJlpt: 4 },
      testSet: { levelN: 5, testType: 'VOCABULARY' },
      otherTypes: []
    })
    await rejects(service.update(9, { lessonId: 4 })).toMatchObject({
      response: { errorKey: 'exercises.LEVEL_INCOMPATIBLE' }
    })
    expect(repo.ruleContext).toHaveBeenCalledWith(4, 8, 9)

    await service.update(9, { isBlocked: true })
    expect(repo.ruleContext).toHaveBeenCalledTimes(1)
  })

  it('a test set already used by another exercise is a 409 (was 400); rewards deduped and checked', async () => {
    repo.create.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('unique', {
        code: 'P2002',
        clientVersion: 'x'
      })
    )
    await rejects(service.create(body)).toMatchObject({
      status: HttpStatus.CONFLICT,
      response: { errorKey: 'exercises.TEST_SET_HAS_EXERCISE' }
    })

    repo.countRewards.mockResolvedValue(1)
    await rejects(service.create({ ...body, rewardId: [1, 2] })).toMatchObject({
      response: { errorKey: 'exercises.REWARD_NOT_FOUND' }
    })
    await service.create({ ...body, rewardId: [1, 1] })
    expect(repo.create).toHaveBeenLastCalledWith(
      expect.objectContaining({ rewardId: [1] })
    )
  })

  it('exercises of a missing lesson: 404 (was an empty list)', async () => {
    repo.getLessonRewardIds.mockResolvedValue(null)
    await rejects(service.getExercisesByLessonId(999)).toMatchObject({
      status: HttpStatus.NOT_FOUND
    })
  })
})
