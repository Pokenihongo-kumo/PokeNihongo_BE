import { HttpStatus } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { TranslationService } from './translation.service'

const prismaError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError('failed', { code, clientVersion: 'test' })

describe('TranslationService', () => {
  const repo = {
    findByLanguage: jest.fn(),
    findByKeyAndLanguage: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    delete: jest.fn()
  }
  const service = new TranslationService(
    repo as never,
    { translate: (k: string) => k } as never
  )
  const body = { languageId: 1, key: 'lesson.title', value: 'Bài' }

  beforeAll(() => {
    jest.spyOn(service['logger'], 'error').mockImplementation(() => undefined)
  })
  beforeEach(() => jest.resetAllMocks())

  it('by-language lists as { results, pagination } (was { data[], total, page, limit, totalPages })', async () => {
    repo.findByLanguage.mockResolvedValue({ data: [{ id: 1 }], total: 3 })

    const res = await service.findByLanguage({ languageId: 1, page: 1, limit: 2 }, 'en')

    expect(res.data).toEqual({
      results: [{ id: 1 }],
      pagination: { current: 1, pageSize: 2, totalPage: 2, totalItem: 3 }
    })
  })

  it('duplicate is 409 and a missing row 404 (both were 400)', async () => {
    repo.findByKeyAndLanguage.mockResolvedValueOnce({ id: 5 })
    await expect(service.create(body)).rejects.toMatchObject({
      status: HttpStatus.CONFLICT
    })

    repo.findById.mockResolvedValueOnce(null)
    await expect(service.delete(5)).rejects.toMatchObject({
      status: HttpStatus.NOT_FOUND
    })
  })

  it('Prisma errors map by type: unique 409, missing language 404, else the old 400', async () => {
    repo.findByKeyAndLanguage.mockResolvedValue(null)

    repo.create.mockRejectedValueOnce(prismaError('P2002'))
    await expect(service.create(body)).rejects.toMatchObject({
      status: HttpStatus.CONFLICT
    })

    repo.create.mockRejectedValueOnce(prismaError('P2003'))
    await expect(service.create(body)).rejects.toMatchObject({
      status: HttpStatus.NOT_FOUND,
      response: { errorKey: 'translation.LANGUAGE_NOT_FOUND' }
    })

    repo.create.mockRejectedValueOnce(new Error('connection reset'))
    await expect(service.create(body)).rejects.toMatchObject({
      status: HttpStatus.BAD_REQUEST
    })
  })
})
