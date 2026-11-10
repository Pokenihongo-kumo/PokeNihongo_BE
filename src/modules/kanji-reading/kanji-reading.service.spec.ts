import { HttpStatus } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { KanjiReadingService } from './kanji-reading.service'

const prismaError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError('failed', { code, clientVersion: 'test' })

describe('KanjiReadingService', () => {
  const repo = {
    existsByKanjiTypeAndReading: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    update: jest.fn()
  }
  const service = new KanjiReadingService(
    repo as never,
    { translate: (k: string) => k } as never
  )
  const body = { kanjiId: 4, readingType: 'onyomi', reading: 'トウ' }

  beforeAll(() => {
    jest.spyOn(service['logger'], 'error').mockImplementation(() => undefined)
  })
  beforeEach(() => jest.resetAllMocks())

  it('a missing kanji is 404 (was 400); duplicates 409; other failures keep 400', async () => {
    repo.existsByKanjiTypeAndReading.mockResolvedValue(false)

    repo.create.mockRejectedValueOnce(prismaError('P2003'))
    await expect(service.create(body)).rejects.toMatchObject({
      status: HttpStatus.NOT_FOUND,
      response: { errorKey: 'kanji_reading.KANJI_NOT_FOUND' }
    })

    repo.existsByKanjiTypeAndReading.mockResolvedValueOnce(true)
    await expect(service.create(body)).rejects.toMatchObject({
      status: HttpStatus.CONFLICT
    })

    repo.create.mockRejectedValueOnce(new Error('connection reset'))
    await expect(service.create(body)).rejects.toMatchObject({
      status: HttpStatus.BAD_REQUEST
    })
  })

  // Errors used to be told apart by their Vietnamese text
  it('update keeps 404/409 by type, whatever the message language', async () => {
    repo.findById.mockResolvedValueOnce(null)
    await expect(service.update(1, { reading: 'ドウ' })).rejects.toMatchObject({
      status: HttpStatus.NOT_FOUND
    })

    repo.findById.mockResolvedValueOnce({ id: 1, ...body })
    repo.existsByKanjiTypeAndReading.mockResolvedValueOnce(true)
    await expect(service.update(1, { reading: 'ドウ' })).rejects.toMatchObject({
      status: HttpStatus.CONFLICT
    })
  })
})
