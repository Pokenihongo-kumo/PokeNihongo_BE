import { HttpStatus } from '@nestjs/common'
import { KanjiService } from './kanji.service'

describe('KanjiService', () => {
  const repo = {
    findMany: jest.fn(),
    findByCharacter: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updatePartial: jest.fn(),
    translationsByKeys: jest.fn(),
    writeTranslations: jest.fn()
  }
  const readings = { create: jest.fn(), update: jest.fn() }
  const service = new KanjiService(
    repo as never,
    readings as never,
    { uploadFile: jest.fn() } as never,
    { translate: (k: string) => k } as never
  )
  const kanji = { id: 7, character: '龘', meaningKey: 'kanji.7.meaning', readings: [] }

  beforeEach(() => {
    jest.resetAllMocks()
    repo.findMany.mockResolvedValue({
      data: [kanji],
      total: 1,
      currentPage: 1,
      pageSize: 10,
      totalPages: 1
    })
    repo.findByCharacter.mockResolvedValue(null)
    repo.create.mockResolvedValue({ ...kanji, meaningKey: '' })
    repo.update.mockResolvedValue(kanji)
    repo.updatePartial.mockResolvedValue(kanji)
    readings.create.mockImplementation(async (r) => r)
  })

  it('management list: the Vietnamese meaning by language code (was languageId 1)', async () => {
    repo.translationsByKeys.mockResolvedValue([
      { key: 'kanji.7.meaning', value: 'dragons', language: { code: 'en' } },
      { key: 'kanji.7.meaning', value: 'rồng bay', language: { code: 'vi' } }
    ])
    const res = await service.getKanjiManagementList({
      currentPage: 1,
      pageSize: 10
    } as never)
    expect(res.data.results[0].meaning).toBe('rồng bay')

    const list = await service.findMany({ currentPage: 1, pageSize: 10 } as never)
    expect(list.data.results[0].meanings).toEqual([
      { meaningKey: 'kanji.7.meaning', translations: { en: 'dragons', vi: 'rồng bay' } }
    ])
    // One query for the whole page
    expect(repo.translationsByKeys).toHaveBeenCalledTimes(2)
  })

  it('create: key kanji.{id}.meaning, a missing vi/en gets the key, blank readings skipped', async () => {
    await service.createWithMeanings({
      character: '龘',
      meanings: [{ translations: { vi: 'rồng bay' } }],
      readings: [
        { readingType: 'onyomi', reading: ' トウ ' },
        { readingType: 'kunyomi', reading: ' ' }
      ]
    } as never)
    expect(repo.writeTranslations).toHaveBeenCalledWith('kanji.7.meaning', {
      vi: 'rồng bay',
      en: 'kanji.7.meaning'
    })
    expect(readings.create.mock.calls).toEqual([
      [{ kanjiId: 7, readingType: 'onyomi', reading: 'トウ' }]
    ])
  })

  it('a duplicate character is a 409; a bad identifier a 422; a missing kanji a 404', async () => {
    repo.findByCharacter.mockResolvedValueOnce(kanji)
    await expect(
      service.createWithMeanings({ character: '龘' } as never)
    ).rejects.toMatchObject({
      status: HttpStatus.CONFLICT
    })
    await expect(service.updateWithMeanings('đ', {} as never)).rejects.toMatchObject({
      status: HttpStatus.UNPROCESSABLE_ENTITY,
      response: { errorKey: 'kanji.CHARACTER_INVALID' }
    })
    repo.findById.mockResolvedValueOnce(null)
    await expect(service.updateWithMeanings('999', {} as never)).rejects.toMatchObject({
      status: HttpStatus.NOT_FOUND
    })
  })
})
