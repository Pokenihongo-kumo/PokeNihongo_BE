import { HttpStatus } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { LevelService } from './level.service'

const prismaError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError(`prisma ${code}`, {
    code,
    clientVersion: 'test'
  })
const level = (id: number, levelNumber: number) => ({
  id,
  levelNumber,
  levelType: 'USER'
})

describe('LevelService', () => {
  const repo = {
    create: jest.fn(),
    update: jest.fn(),
    findById: jest.fn(),
    findNextLevelByNumber: jest.fn(),
    findPrevLevelByNumber: jest.fn(),
    updateNextLevel: jest.fn()
  }
  const service = new LevelService(
    repo as never,
    { translate: (k: string) => k } as never
  )
  const statusOf = (promise: Promise<unknown>) =>
    promise.then(
      () => undefined,
      (error) => error.getStatus?.()
    )

  beforeEach(() => jest.resetAllMocks())

  it('links a new level between its neighbours of the same type', async () => {
    repo.create.mockResolvedValue(level(20, 5))
    repo.findNextLevelByNumber.mockResolvedValue(level(21, 6))
    repo.findPrevLevelByNumber.mockResolvedValue(level(19, 4))

    await service.create({
      data: { levelNumber: 5, requiredExp: 100, levelType: 'USER' },
      createdById: 1
    })

    expect(repo.updateNextLevel).toHaveBeenCalledWith(20, 21)
    expect(repo.updateNextLevel).toHaveBeenCalledWith(19, 20)
  })

  it('keeps the created level when linking fails (best effort, logged)', async () => {
    jest.spyOn(service['logger'], 'error').mockImplementation(() => undefined)
    repo.create.mockResolvedValue(level(20, 5))
    repo.findNextLevelByNumber.mockRejectedValue(new Error('db down'))

    const result = await service.create({
      data: { levelNumber: 5, requiredExp: 100, levelType: 'USER' },
      createdById: 1
    })

    expect(result.data).toEqual(level(20, 5))
    expect(service['logger'].error).toHaveBeenCalled()
  })

  it('rejects a next level that is not the same type and the following number', async () => {
    repo.findById.mockResolvedValueOnce(level(20, 5)).mockResolvedValueOnce(level(30, 9))

    expect(
      await statusOf(
        service.update({ id: 20, data: { nextLevelId: 30 }, updatedById: 1 })
      )
    ).toBe(HttpStatus.CONFLICT)
    expect(repo.update).not.toHaveBeenCalled()
  })

  it('maps Prisma errors in context: duplicate 409, missing 404', async () => {
    repo.create.mockRejectedValue(prismaError('P2002'))
    expect(
      await statusOf(
        service.create({
          data: { levelNumber: 5, requiredExp: 100, levelType: 'USER' },
          createdById: 1
        })
      )
    ).toBe(HttpStatus.CONFLICT)

    repo.findById.mockResolvedValue(null)
    expect(
      await statusOf(service.update({ id: 99, data: { requiredExp: 1 }, updatedById: 1 }))
    ).toBe(HttpStatus.NOT_FOUND)
  })
})
