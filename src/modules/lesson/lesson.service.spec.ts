import { HttpStatus } from '@nestjs/common'
import { LessonService } from './lesson.service'

describe('LessonService', () => {
  const repo = {
    findById: jest.fn(),
    findMany: jest.fn(),
    titles: jest.fn(),
    createWithTitle: jest.fn(),
    update: jest.fn(),
    categoryExists: jest.fn(),
    testExists: jest.fn(),
    countRewards: jest.fn(),
    maxLessonOrder: jest.fn()
  }
  const languages = { getIdByCode: jest.fn(), getWithListCode: jest.fn() }
  const service = new LessonService(
    repo as never,
    languages as never,
    { translate: (k: string) => k } as never
  )
  const lesson = { id: 7, titleKey: 'lesson.7.title', isPublished: false }
  const body = {
    titleJp: '課',
    lessonCategoryId: 2,
    estimatedTimeMinutes: 30,
    isPublished: false,
    version: '1.0.0'
  }

  beforeEach(() => {
    jest.resetAllMocks()
    repo.categoryExists.mockResolvedValue(true)
    repo.testExists.mockResolvedValue(true)
    repo.maxLessonOrder.mockResolvedValue(4)
    repo.createWithTitle.mockResolvedValue(lesson)
    repo.findById.mockResolvedValue(lesson)
    repo.update.mockResolvedValue(lesson)
    // Real ids differ from the vi=1/en=2/ja=3 that used to be hard-coded
    languages.getWithListCode.mockImplementation(async (codes: string[]) =>
      [
        { id: 31, code: 'vi' },
        { id: 32, code: 'en' }
      ].filter((l) => codes.includes(l.code))
    )
  })

  it('saves the title with the language ids from the DB (were fixed 1/2/3)', async () => {
    await service.createLesson(
      {
        ...body,
        translations: {
          meaning: [
            { language_code: 'vi', value: 'Bài' },
            { language_code: 'ko', value: '?' }
          ]
        }
      },
      1
    )
    const [data, titles] = repo.createWithTitle.mock.calls[0]
    expect(titles).toEqual([{ languageId: 31, value: 'Bài' }])
    expect(data).toMatchObject({ lessonOrder: 5, createdById: 1 })

    // Without translations: titleJp in vi and en
    await service.createLesson(body, 1)
    expect(repo.createWithTitle.mock.calls[1][1]).toEqual([
      { languageId: 31, value: '課' },
      { languageId: 32, value: '課' }
    ])
  })

  it('update writes the title translations (they used to reach Prisma and fail)', async () => {
    await service.updateLesson(7, {
      titleJp: '新',
      translations: { meaning: [{ language_code: 'en', value: 'New' }] }
    })
    const [, data, titles] = repo.update.mock.calls[0]
    expect(data).not.toHaveProperty('translations')
    expect(titles).toEqual([{ languageId: 32, value: 'New' }])
  })

  it('category, test and rewards must exist; a missing lesson is a 404', async () => {
    repo.categoryExists.mockResolvedValueOnce(false)
    await expect(service.createLesson(body, 1)).rejects.toMatchObject({
      status: HttpStatus.NOT_FOUND,
      response: { errorKey: 'lesson.CATEGORY_NOT_FOUND' }
    })
    repo.testExists.mockResolvedValueOnce(false)
    await expect(service.createLesson({ ...body, testId: 9 }, 1)).rejects.toMatchObject({
      response: { errorKey: 'lesson.TEST_NOT_FOUND' }
    })
    repo.countRewards.mockResolvedValueOnce(1)
    await expect(
      service.createLesson({ ...body, rewardId: [1, 2, 2] }, 1)
    ).rejects.toMatchObject({
      response: { errorKey: 'lesson.REWARD_NOT_FOUND' }
    })
    repo.findById.mockResolvedValueOnce(null)
    await expect(service.getLessonById(999)).rejects.toMatchObject({
      status: HttpStatus.NOT_FOUND
    })
  })

  it('title: language codes in the array (were lang_{id}); one string with ?lang', async () => {
    repo.titles.mockResolvedValue([
      { key: 'lesson.7.title', value: 'Bài', language: { code: 'vi' } }
    ])
    const all = await service.getLessonById(7)
    expect(all.data.title).toEqual([{ language: 'vi', value: 'Bài' }])

    languages.getIdByCode.mockResolvedValue(31)
    const one = await service.getLessonById(7, 'vi')
    expect(one.data.title).toBe('Bài')
    expect(repo.titles).toHaveBeenLastCalledWith(['lesson.7.title'], 31)
  })
})
