import { HttpStatus, NotFoundException } from '@nestjs/common'
import { VocabularyHelperService } from './vocabulary.helper.service'
import { VocabularyService } from './vocabulary.service'
import { Prisma } from '@prisma/client'

describe('VocabularyHelperService.findOrCreateKanji', () => {
  const prisma = {
    kanji: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() }
  }
  // findByCharacter throws a 404 for a missing kanji: it must not be in the path
  const kanjiService = {
    findByCharacter: jest.fn().mockRejectedValue(new NotFoundException())
  }
  const helper = new VocabularyHelperService(
    prisma as never,
    kanjiService as never,
    {} as never,
    {} as never,
    {} as never
  )

  beforeEach(() => {
    prisma.kanji.findUnique.mockReset()
    prisma.kanji.create.mockReset()
    prisma.kanji.update.mockReset()
  })

  it('creates a missing kanji (the create branch never ran: the 404 escaped)', async () => {
    prisma.kanji.findUnique.mockResolvedValue(null)
    prisma.kanji.create.mockResolvedValue({ id: 9, character: '龘' })

    await expect(helper.findOrCreateKanji('龘')).resolves.toEqual({
      id: 9,
      character: '龘'
    })
    expect(prisma.kanji.update).toHaveBeenCalledWith({
      where: { id: 9 },
      data: { meaningKey: 'kanji.9.meaning' }
    })
  })

  it('returns an existing kanji without creating one', async () => {
    prisma.kanji.findUnique.mockResolvedValue({ id: 4, character: '日' })
    await expect(helper.findOrCreateKanji('日')).resolves.toEqual({
      id: 4,
      character: '日'
    })
    expect(prisma.kanji.create).not.toHaveBeenCalled()
  })
})

describe('VocabularyService', () => {
  const repo = { delete: jest.fn() }
  const service = new VocabularyService(
    repo as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    { translate: (k: string) => k } as never
  )

  it('isJapaneseText: kana or kanji, no Latin (accented or Greek letters passed before)', () => {
    const isJapanese = (t: string) => service['isJapaneseText'](t)
    expect(isJapanese('日本語')).toBe(true)
    expect(isJapanese('ひらがな')).toBe(true)
    expect(isJapanese('ệ')).toBe(false)
    expect(isJapanese('Ωж')).toBe(false)
    expect(isJapanese('Viet')).toBe(false)
  })

  it('deleting a missing word is a 404 with a key', async () => {
    repo.delete.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('missing', {
        code: 'P2025',
        clientVersion: 'x'
      })
    )
    await expect(service.remove(1)).rejects.toMatchObject({
      status: HttpStatus.NOT_FOUND,
      response: { errorKey: 'vocabulary.NOT_FOUND' }
    })
  })
})
