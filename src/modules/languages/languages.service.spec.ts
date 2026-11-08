import { HttpStatus } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { LanguagesService } from './languages.service'

const prismaError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError(`prisma ${code}`, {
    code,
    clientVersion: 'test'
  })

describe('LanguagesService', () => {
  const repo = {
    findById: jest.fn(),
    findByCode: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteByCode: jest.fn()
  }
  const service = new LanguagesService(
    repo as never,
    { translate: (k: string) => k } as never
  )
  const failure = (promise: Promise<unknown>) =>
    promise.then(
      () => undefined,
      (error) => error
    )

  beforeAll(() => {
    jest.spyOn(service['logger'], 'error').mockImplementation(() => undefined)
    jest.spyOn(service['logger'], 'log').mockImplementation(() => undefined)
  })
  beforeEach(() => jest.resetAllMocks())

  it('delete of a missing language is 404, no longer the generic 400', async () => {
    repo.findById.mockResolvedValue(null)
    expect((await failure(service.delete(1))).getStatus()).toBe(HttpStatus.NOT_FOUND)

    repo.findByCode.mockResolvedValue(null)
    expect((await failure(service.deleteByCode('zz'))).getStatus()).toBe(
      HttpStatus.NOT_FOUND
    )
  })

  it('keeps the old fallback for unexpected errors per method', async () => {
    const boom = new Error('connection reset')
    repo.findById.mockResolvedValue({ id: 1, code: 'vi' })
    repo.delete.mockRejectedValue(boom)
    repo.update.mockRejectedValue(boom)

    // delete/updateByCode/deleteByCode answered 400; create/update let it through
    expect((await failure(service.delete(1))).getStatus()).toBe(HttpStatus.BAD_REQUEST)
    expect(await failure(service.update(1, { name: 'Việt' }))).toBe(boom)
  })

  it('maps a duplicate code from Prisma to 409', async () => {
    repo.findByCode.mockResolvedValue(null)
    repo.create.mockRejectedValue(prismaError('P2002'))

    expect(
      (await failure(service.create({ code: 'vi', name: 'Việt' }))).getStatus()
    ).toBe(HttpStatus.CONFLICT)
  })

  it('creates only the missing default languages, with their ids and without flag', async () => {
    repo.findByCode.mockImplementation(async (code: string) =>
      code === 'vi' ? { id: 1 } : null
    )

    await service.createDefaultLanguages()

    expect(repo.create.mock.calls.map(([data]) => data)).toEqual([
      { id: 2, name: 'English', code: 'en' },
      { id: 3, name: '日本語', code: 'ja' }
    ])
  })
})
