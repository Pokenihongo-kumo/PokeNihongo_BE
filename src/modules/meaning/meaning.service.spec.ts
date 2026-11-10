import { HttpStatus } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { MeaningService } from './meaning.service'

const prismaError = (code: string, meta?: Record<string, unknown>) =>
  new Prisma.PrismaClientKnownRequestError('failed', {
    code,
    clientVersion: 'test',
    meta
  })

describe('MeaningService', () => {
  const repo = { create: jest.fn(), findByVocabularyId: jest.fn() }
  const translationHelper = { getTranslationsByKey: jest.fn() }
  const service = new MeaningService(
    repo as never,
    translationHelper as never,
    { translate: (k: string) => k } as never
  )

  beforeAll(() => {
    jest.spyOn(service['logger'], 'error').mockImplementation(() => undefined)
    jest.spyOn(service['logger'], 'warn').mockImplementation(() => undefined)
  })
  beforeEach(() => jest.resetAllMocks())

  it('a missing vocabulary or word type is 404 (was 400); other failures keep 400', async () => {
    repo.create.mockRejectedValueOnce(
      prismaError('P2003', { field_name: 'Meaning_vocabularyId_fkey (index)' })
    )
    await expect(service.create({ vocabularyId: 9 })).rejects.toMatchObject({
      status: HttpStatus.NOT_FOUND,
      response: { errorKey: 'meaning.VOCABULARY_NOT_FOUND' }
    })

    repo.create.mockRejectedValueOnce(
      prismaError('P2003', { field_name: 'Meaning_wordTypeId_fkey (index)' })
    )
    await expect(
      service.create({ vocabularyId: 9, wordTypeId: 3 })
    ).rejects.toMatchObject({
      status: HttpStatus.NOT_FOUND,
      response: { errorKey: 'wordtype.NOT_FOUND' }
    })

    repo.create.mockRejectedValueOnce(new Error('connection reset'))
    await expect(service.create({ vocabularyId: 9 })).rejects.toMatchObject({
      status: HttpStatus.BAD_REQUEST
    })
  })

  it('meanings of a vocabulary carry their translations; a failed lookup gives []', async () => {
    repo.findByVocabularyId.mockResolvedValue([
      { id: 1, vocabularyId: 9, meaningKey: 'meaning.9.definition' }
    ])
    translationHelper.getTranslationsByKey.mockResolvedValueOnce({
      vi: 'nghĩa',
      en: 'meaning'
    })

    expect(await service.findByVocabularyId(9)).toEqual([
      {
        id: 1,
        vocabularyId: 9,
        meaningKey: 'meaning.9.definition',
        meaningTranslations: [
          { language_code: 'vi', value: 'nghĩa' },
          { language_code: 'en', value: 'meaning' }
        ],
        exampleTranslations: []
      }
    ])

    translationHelper.getTranslationsByKey.mockRejectedValueOnce(new Error('down'))
    expect((await service.findByVocabularyId(9))[0].meaningTranslations).toEqual([])
  })
})
