import { HttpStatus } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { GrammarUsageService } from './grammar-usage.service'

const prismaError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError('failed', { code, clientVersion: 'test' })

describe('GrammarUsageService', () => {
  const repo = {
    findMany: jest.fn(),
    findById: jest.fn(),
    update: jest.fn()
  }
  const service = new GrammarUsageService(
    repo as never,
    {
      translate: (k: string) => k
    } as never
  )

  beforeAll(() => {
    jest.spyOn(service['logger'], 'error').mockImplementation(() => undefined)
  })
  beforeEach(() => jest.resetAllMocks())

  it('lists as { results, pagination } (was { data[], total, page, limit, totalPages })', async () => {
    repo.findMany.mockResolvedValue({ data: [{ id: 1 }], total: 11 })

    const res = await service.getGrammarUsageList({ page: 2, limit: 5 } as never, 'en')

    expect(res.data).toEqual({
      results: [{ id: 1 }],
      pagination: { current: 2, pageSize: 5, totalPage: 3, totalItem: 11 }
    })
  })

  it('maps errors by type: unique 409, not found 404, anything else the old 400', async () => {
    repo.findById.mockResolvedValue({ id: 3, grammarId: 1, explanationKey: 'k' })

    repo.update.mockRejectedValueOnce(prismaError('P2002'))
    await expect(service.updateGrammarUsage(3, {})).rejects.toMatchObject({
      status: HttpStatus.CONFLICT
    })
    repo.update.mockRejectedValueOnce(prismaError('P2025'))
    await expect(service.updateGrammarUsage(3, {})).rejects.toMatchObject({
      status: HttpStatus.NOT_FOUND
    })
    repo.update.mockRejectedValueOnce(new Error('connection reset'))
    await expect(service.updateGrammarUsage(3, {})).rejects.toMatchObject({
      status: HttpStatus.BAD_REQUEST
    })
  })
})
