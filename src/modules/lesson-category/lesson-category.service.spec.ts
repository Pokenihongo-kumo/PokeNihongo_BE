import { HttpStatus } from '@nestjs/common'
import { LessonCategoryService } from './lesson-category.service'

const category = (id: number, nameKey: string) => ({
  id,
  nameKey,
  slug: nameKey.replace(/\W+/g, '-'),
  createdAt: new Date(),
  updatedAt: new Date()
})

describe('LessonCategoryService', () => {
  const repo = {
    findById: jest.fn(),
    findBySlug: jest.fn(),
    checkSlugExists: jest.fn(),
    create: jest.fn()
  }
  const translations = { findByKeyAndLanguage: jest.fn(), create: jest.fn() }
  const languages = { getIdByCode: jest.fn(), getWithListCode: jest.fn() }
  const service = new LessonCategoryService(
    repo as never,
    translations as never,
    languages as never,
    { translate: (k: string) => k } as never
  )

  beforeAll(() => {
    jest.spyOn(service['logger'], 'error').mockImplementation(() => undefined)
    jest.spyOn(service['logger'], 'warn').mockImplementation(() => undefined)
  })
  beforeEach(() => jest.resetAllMocks())

  it('reads return the name translated for the request language, else the nameKey', async () => {
    repo.findById.mockResolvedValue(category(4, 'category.reading'))
    languages.getIdByCode.mockResolvedValue(9)
    translations.findByKeyAndLanguage.mockResolvedValue({ value: 'Reading Practice' })

    const { data } = await service.getLessonCategoryById({ id: 4 }, 'en')

    expect(languages.getIdByCode).toHaveBeenCalledWith('en')
    expect(translations.findByKeyAndLanguage).toHaveBeenCalledWith('category.reading', 9)
    expect(data).toMatchObject({ id: 4, name: 'Reading Practice' })

    languages.getIdByCode.mockResolvedValue(null)
    expect((await service.getLessonCategoryById({ id: 4 }, 'ja')).data.name).toBe(
      'category.reading'
    )
  })

  it('writes default names with the real vi/en language ids (were hard-coded 1 and 2)', async () => {
    repo.checkSlugExists.mockResolvedValue(false)
    repo.create.mockResolvedValue(category(7, 'category.custom'))
    languages.getWithListCode.mockResolvedValue([
      { id: 31, code: 'vi' },
      { id: 32, code: 'en' }
    ])
    translations.create.mockResolvedValue({})

    await service.createLessonCategory({ nameKey: 'category.custom' })

    expect(translations.create.mock.calls.map(([t]) => t)).toEqual([
      { key: 'category.custom', languageId: 31, value: 'Danh mục 7' },
      { key: 'category.custom', languageId: 32, value: 'Category 7' }
    ])
  })

  it('a missing category is 404; other failures keep the generic 400', async () => {
    repo.findBySlug.mockResolvedValue(null)
    await expect(service.getLessonCategoryBySlug('none')).rejects.toMatchObject({
      status: HttpStatus.NOT_FOUND
    })

    repo.findById.mockRejectedValue(new Error('connection reset'))
    await expect(service.getLessonCategoryById({ id: 1 })).rejects.toMatchObject({
      status: HttpStatus.BAD_REQUEST
    })
  })
})
