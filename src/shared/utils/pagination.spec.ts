import { toPaginationMeta, toSkipTake } from './pagination'

describe('pagination helpers', () => {
  it('turns a 1-based page into skip/take', () => {
    expect(toSkipTake(1, 15)).toEqual({ skip: 0, take: 15 })
    expect(toSkipTake(3, 10)).toEqual({ skip: 20, take: 10 })
  })

  it('builds the pagination block clients read', () => {
    expect(toPaginationMeta(2, 10, 25)).toEqual({
      current: 2,
      pageSize: 10,
      totalPage: 3,
      totalItem: 25
    })
    expect(toPaginationMeta(1, 10, 0).totalPage).toBe(0)
  })
})
