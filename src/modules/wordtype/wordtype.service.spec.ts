import { HttpStatus } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { WordTypeService } from './wordtype.service'

const prismaError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError(`prisma ${code}`, {
    code,
    clientVersion: 'test'
  })

// Errors are mapped by type, no longer by searching the message text
describe('WordTypeService write errors', () => {
  const repo = {
    findByNameKey: jest.fn(),
    findById: jest.fn(),
    existsByNameKey: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  }
  const i18n = { translate: (key: string) => key }
  const service = new WordTypeService(
    repo as never,
    {} as never,
    {} as never,
    i18n as never
  )
  const statusOf = (promise: Promise<unknown>) =>
    promise.then(
      () => undefined,
      (error) => error.getStatus?.()
    )

  beforeAll(() => {
    jest.spyOn(service['logger'], 'error').mockImplementation(() => undefined)
    jest.spyOn(service['logger'], 'log').mockImplementation(() => undefined)
  })
  beforeEach(() => jest.resetAllMocks())

  it('answers 409 when the nameKey is taken between the check and the insert', async () => {
    repo.findByNameKey.mockResolvedValue(null)
    repo.create.mockRejectedValue(prismaError('P2002'))

    expect(await statusOf(service.create({ nameKey: 'wordtype.noun.name' }))).toBe(
      HttpStatus.CONFLICT
    )
  })

  it('answers 404 when the row disappears before update or delete', async () => {
    repo.findById.mockResolvedValue({ id: 1, nameKey: 'wordtype.noun.name' })
    repo.update.mockRejectedValue(prismaError('P2025'))
    repo.delete.mockRejectedValue(prismaError('P2025'))

    expect(await statusOf(service.update(1, { nameKey: 'wordtype.noun.name' }))).toBe(
      HttpStatus.NOT_FOUND
    )
    expect(await statusOf(service.delete(1))).toBe(HttpStatus.NOT_FOUND)
  })

  it('keeps its own HTTP errors and the generic 400 for anything else', async () => {
    repo.findById.mockResolvedValue(null)
    expect(await statusOf(service.delete(1))).toBe(HttpStatus.NOT_FOUND)

    repo.findByNameKey.mockResolvedValue({ id: 2 })
    expect(await statusOf(service.create({ nameKey: 'wordtype.noun.name' }))).toBe(
      HttpStatus.CONFLICT
    )

    repo.findByNameKey.mockResolvedValue(null)
    repo.create.mockRejectedValue(new Error('connection reset'))
    expect(await statusOf(service.create({ nameKey: 'wordtype.noun.name' }))).toBe(
      HttpStatus.BAD_REQUEST
    )
  })
})
