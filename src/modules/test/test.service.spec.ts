import { HttpStatus } from '@nestjs/common'
import { TestService } from './test.service'

describe('TestService', () => {
  const repo = {
    findById: jest.fn(),
    updateWithMeanings: jest.fn(),
    delete: jest.fn()
  }
  const prisma = {
    testSet: { findMany: jest.fn() },
    testTestSet: {
      findMany: jest.fn(),
      count: jest.fn(),
      deleteMany: jest.fn(),
      createMany: jest.fn()
    }
  }
  const userTests = { updateStatusByTestId: jest.fn(), initAllUsersTests: jest.fn() }
  const userTestRepo = { findByUserAndTest: jest.fn() }
  const service = new TestService(
    repo as never,
    prisma as never,
    {} as never,
    {} as never,
    userTestRepo as never,
    userTests as never,
    {
      translate: (k: string, _l: string, args?: object) =>
        args ? `${k} ${JSON.stringify(args)}` : k
    } as never
  )

  beforeEach(() => {
    jest.resetAllMocks()
    repo.findById.mockResolvedValue({
      id: 5,
      testType: 'QUIZ_TEST',
      status: 'DRAFT',
      price: 0,
      creatorId: 1
    })
    prisma.testTestSet.findMany.mockResolvedValue([])
    prisma.testTestSet.count.mockResolvedValue(0)
  })

  it("someone else's test is a 403 and a missing one a 404 (both were thrown as classes: 500)", async () => {
    await expect(service.deleteTest(5, 2)).rejects.toMatchObject({
      status: HttpStatus.FORBIDDEN,
      response: { errorKey: 'test.PERMISSION_DENIED' }
    })
    repo.findById.mockResolvedValueOnce(null)
    await expect(service.updateTestWithMeanings(9, {}, 1)).rejects.toMatchObject({
      status: HttpStatus.NOT_FOUND
    })
    expect(repo.delete).not.toHaveBeenCalled()
  })

  it('placement questions report the real reason (it used to become a generic 400)', async () => {
    await expect(service.getRandomQuestionsForPlacementTest(5, 1)).rejects.toMatchObject({
      response: { errorKey: 'test.NOT_PLACEMENT_TEST' }
    })
    repo.findById.mockResolvedValueOnce({ id: 5, testType: 'PLACEMENT_TEST_DONE' })
    userTestRepo.findByUserAndTest.mockResolvedValue(null)
    await expect(service.getRandomQuestionsForPlacementTest(5, 1)).rejects.toMatchObject({
      status: HttpStatus.FORBIDDEN,
      response: { errorKey: 'test.NO_ACCESS' }
    })
  })

  it('adding test sets: missing ones are a 404 with their ids; type rules per test type', async () => {
    prisma.testSet.findMany.mockResolvedValueOnce([{ id: 1, testType: 'VOCABULARY' }])
    await expect(
      service.addTestSetsToTest(5, { testSetIds: [1, 2] })
    ).rejects.toMatchObject({
      status: HttpStatus.NOT_FOUND,
      response: { errorKey: 'test.TESTSETS_NOT_FOUND', errorArgs: { ids: '2' } }
    })

    repo.findById.mockResolvedValue({ id: 5, testType: 'LESSON_REVIEW' })
    prisma.testSet.findMany.mockResolvedValueOnce([
      { id: 1, testType: 'VOCABULARY' },
      { id: 2, testType: 'VOCABULARY' }
    ])
    await expect(
      service.addTestSetsToTest(5, { testSetIds: [1, 2] })
    ).rejects.toMatchObject({
      response: {
        errorKey: 'test.DUPLICATE_NEW_TYPES',
        errorArgs: { types: 'VOCABULARY' }
      }
    })

    repo.findById.mockResolvedValue({ id: 5, testType: 'SPEAKING_TEST' })
    prisma.testSet.findMany.mockResolvedValueOnce([{ id: 3, testType: 'SPEAKING' }])
    prisma.testTestSet.count.mockResolvedValueOnce(1)
    await expect(service.addTestSetsToTest(5, { testSetIds: [3] })).rejects.toMatchObject(
      {
        response: {
          errorKey: 'test.SPEAKING_TOO_MANY',
          errorArgs: { existing: 1, adding: 1 }
        }
      }
    )
    expect(prisma.testTestSet.createMany).not.toHaveBeenCalled()
  })

  it('a status change re-syncs the user tests (paid ACTIVE test -> NOT_STARTED)', async () => {
    repo.updateWithMeanings.mockResolvedValue({ id: 5 })
    await service.updateTestWithMeanings(5, { status: 'ACTIVE', price: 10 }, 1)
    expect(userTests.updateStatusByTestId).toHaveBeenCalledWith(5, 'NOT_STARTED')

    await service.updateTestWithMeanings(5, { status: 'INACTIVE' }, 1)
    expect(userTests.updateStatusByTestId).toHaveBeenLastCalledWith(5, 'NOT_STARTED')
    expect(userTests.initAllUsersTests).toHaveBeenCalledTimes(2)
  })
})
