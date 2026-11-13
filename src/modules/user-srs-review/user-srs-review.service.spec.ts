import { HttpStatus } from '@nestjs/common'
import { SrsReviewService } from './user-srs-review.service'
import { SrsReviewRepo } from './user-srs-review.repo'

describe('SrsReviewService', () => {
  const repo = {
    findById: jest.fn(),
    updateById: jest.fn(),
    findUnique: jest.fn(),
    upsert: jest.fn(),
    update: jest.fn()
  }
  const service = new SrsReviewService(
    {} as never,
    repo as never,
    {} as never,
    { translate: (k: string) => k } as never
  )
  const review = { id: 3, userId: 7, srsLevel: 2, incorrectStreak: 0 }

  beforeEach(() => {
    jest.resetAllMocks()
    repo.findById.mockResolvedValue(review)
    repo.update.mockImplementation(async (_u, _t, _i, data) => ({ ...review, ...data }))
  })

  it("mark as read: missing is a 404, someone else's a 403", async () => {
    repo.findById.mockResolvedValueOnce(null)
    await expect(service.markRead(7, 3)).rejects.toMatchObject({
      status: HttpStatus.NOT_FOUND,
      response: { errorKey: 'srs_review.NOT_FOUND' }
    })
    await expect(service.markRead(8, 3)).rejects.toMatchObject({
      status: HttpStatus.FORBIDDEN
    })
    expect(repo.updateById).not.toHaveBeenCalled()
  })

  it('applyReview on new content creates the review first, then schedules it', async () => {
    repo.findUnique.mockResolvedValue(null)
    repo.upsert.mockResolvedValue({ ...review, srsLevel: 0 })
    const res = await service.applyReview(7, 'vocabulary', 11, { result: 'correct' })
    expect(repo.upsert).toHaveBeenCalledWith(7, 'VOCABULARY', 11)
    expect(res.data).toMatchObject({ srsLevel: 1, incorrectStreak: 0, isLeech: false })
  })

  it('wrong answers reset the level; five in a row make a leech', async () => {
    repo.findUnique.mockResolvedValue({ ...review, incorrectStreak: 4 })
    const res = await service.applyReview(7, 'KANJI', 2, { result: 'incorrect' })
    expect(res.data).toMatchObject({ srsLevel: 0, incorrectStreak: 5, isLeech: true })
  })
})

describe('SrsReviewRepo.upsert', () => {
  it('a new review gets nextReviewDate (required, no default: creating one failed)', async () => {
    const upsert = jest.fn().mockResolvedValue({})
    const repo = new SrsReviewRepo({ userSrsReview: { upsert } } as never)
    await repo.upsert(7, 'GRAMMAR', 5)
    expect(upsert.mock.calls[0][0].create).toMatchObject({
      userId: 7,
      contentType: 'GRAMMAR',
      contentId: 5,
      nextReviewDate: expect.any(Date)
    })
  })
})
