import { GrammarRepo } from './grammar.repo'

describe('GrammarRepo.createWithUsage', () => {
  const tx = {
    grammar: { create: jest.fn() },
    grammarUsage: { create: jest.fn(), update: jest.fn() },
    languages: { findMany: jest.fn() },
    translation: { createMany: jest.fn() }
  }
  const prisma = { $transaction: (fn: (t: typeof tx) => unknown) => fn(tx) }
  const repo = new GrammarRepo(prisma as never)

  beforeEach(() => {
    jest.resetAllMocks()
    tx.grammar.create.mockResolvedValue({ id: 5, structure: '〜ている', level: 'N5' })
    tx.grammarUsage.create.mockResolvedValue({ id: 12 })
    tx.grammarUsage.update.mockImplementation(({ where, data }) => ({
      id: where.id,
      grammarId: 5,
      ...data
    }))
  })

  it('keys the usage by its own id and writes translations for known languages only', async () => {
    tx.languages.findMany.mockResolvedValue([
      { id: 1, code: 'vi' },
      { id: 2, code: 'en' }
    ])
    tx.translation.createMany.mockResolvedValue({ count: 4 })

    const result = await repo.createWithUsage({
      structure: '〜ている',
      level: 'N5',
      usage: { exampleSentenceJp: '食べている' },
      translations: {
        usage: [
          { language_code: 'vi', explanation: 'đang', example: 'đang ăn' },
          { language_code: 'en', explanation: 'ongoing', example: 'eating' },
          { language_code: 'xx', explanation: '?', example: '?' }
        ]
      }
    } as never)

    expect(tx.grammarUsage.update).toHaveBeenCalledWith({
      where: { id: 12 },
      data: {
        explanationKey: 'grammar.5.usage.12.explanation',
        exampleSentenceKey: 'grammar.5.usage.12.example'
      }
    })
    expect(tx.translation.createMany).toHaveBeenCalledWith({
      data: [
        { key: 'grammar.5.usage.12.explanation', value: 'đang', languageId: 1 },
        { key: 'grammar.5.usage.12.example', value: 'đang ăn', languageId: 1 },
        { key: 'grammar.5.usage.12.explanation', value: 'ongoing', languageId: 2 },
        { key: 'grammar.5.usage.12.example', value: 'eating', languageId: 2 }
      ],
      skipDuplicates: true
    })
    expect(result.translationsCreated).toBe(4)
  })

  it('without a usage only the grammar is created', async () => {
    const result = await repo.createWithUsage({ structure: '〜た', level: 'N5' } as never)

    expect(tx.grammarUsage.create).not.toHaveBeenCalled()
    expect(tx.translation.createMany).not.toHaveBeenCalled()
    expect(result).toMatchObject({ grammarUsage: null, translationsCreated: 0 })
  })
})
