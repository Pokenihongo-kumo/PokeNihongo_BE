import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/shared/services/prisma.service'
import {
  CreateTestSetWithMeaningsBodyType,
  GetTestSetListQueryType,
  TestSetType,
  UpdateTestSetBodyType,
  UpdateTestSetWithMeaningsBodyType
} from './entities/testset.entity'
import { toSkipTake } from '@/shared/utils/pagination'
import { Prisma, TestSet } from '@prisma/client'

type Tx = Prisma.TransactionClient
type TextField = 'name' | 'description'
const TEXT_FIELDS: TextField[] = ['name', 'description']

// name/description live in translations: testset.{id}.{field}.meaning.{n}
const meaningPrefix = (id: number, field: TextField) => `testset.${id}.${field}.meaning.`

export type TestSetMeaning = {
  field: TextField
  translations: Partial<Record<string, string>>
}

export type TestSetFields = Pick<
  Prisma.TestSetUncheckedCreateInput,
  'content' | 'audioUrl' | 'price' | 'levelN' | 'testType' | 'status'
>

// One question of the upsert, already resolved to its QuestionBank
export type UpsertQuestion = {
  questionBankId: number
  edit?: Prisma.QuestionBankUncheckedUpdateInput
  questionKey?: string
  meanings?: { translations: Record<string, string> }[]
}

@Injectable()
export class TestSetRepo {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: number, language?: string): Promise<TestSetType | null> {
    const row = await this.prisma.testSet.findUnique({ where: { id } })
    if (!row) return null
    const [testSet] = await this.withTexts([row], language)
    return testSet
  }

  async findMany(
    query: GetTestSetListQueryType
  ): Promise<{ data: TestSetType[]; total: number }> {
    const { currentPage, pageSize, search, language, sortBy, sort } = query
    const where: Prisma.TestSetWhereInput = {
      ...(query.levelN !== undefined && { levelN: query.levelN }),
      ...(query.testType && { testType: query.testType }),
      ...(query.status && { status: query.status }),
      ...(query.creatorId && { creatorId: query.creatorId }),
      ...(query.noPrice && { price: 0 }),
      // Test sets not used by any exercise yet
      ...(query.noExercies && { exercises: { none: {} } }),
      ...(search && {
        OR: [
          { content: { contains: search, mode: 'insensitive' } },
          { id: { in: await this.idsWithTextLike(search) } }
        ]
      })
    }

    const [rows, total] = await Promise.all([
      this.prisma.testSet.findMany({
        where,
        ...toSkipTake(currentPage, pageSize),
        orderBy: { [sortBy]: sort }
      }),
      this.prisma.testSet.count({ where })
    ])
    return { data: await this.withTexts(rows, language), total }
  }

  // Questions of the test set with their type (for the change rules)
  async questionTypesOf(testSetId: number) {
    const links = await this.prisma.testSetQuestionBank.findMany({
      where: { testSetId },
      select: { questionBank: { select: { questionType: true } } }
    })
    return links.map((l) => l.questionBank.questionType)
  }

  // TestSetQuestionBank id -> QuestionBank id
  async linksOf(testSetId: number): Promise<Map<number, number>> {
    const links = await this.prisma.testSetQuestionBank.findMany({
      where: { testSetId },
      select: { id: true, questionBankId: true }
    })
    return new Map(links.map((l) => [l.id, l.questionBankId]))
  }

  async questionBanksByIds(ids: number[]) {
    const rows = await this.prisma.questionBank.findMany({
      where: { id: { in: ids } },
      select: { id: true, questionKey: true, questionType: true }
    })
    return new Map(rows.map((r) => [r.id, r]))
  }

  delete(id: number) {
    return this.prisma.testSet.delete({ where: { id } })
  }

  createWithMeanings(data: CreateTestSetWithMeaningsBodyType, userId: number) {
    const { meanings, ...fields } = data
    return this.prisma.$transaction(async (tx) => {
      const testSet = await this.createRow(tx, fields, userId)
      await this.writeMeanings(tx, testSet.id, meanings)
      return this.toTestSet(testSet)
    })
  }

  updateWithMeanings(id: number, data: UpdateTestSetWithMeaningsBodyType) {
    const { meanings, ...fields } = data
    return this.prisma.$transaction(async (tx) => {
      const testSet = await tx.testSet.update({ where: { id }, data: fields })
      if (meanings) await this.writeMeanings(tx, id, meanings)
      return this.toTestSet(testSet)
    })
  }

  // PUT /testset/:id: each translation becomes the first meaning of its field
  // (it was written to testset.{id}.{field}, a key the readers skip)
  updateWithTranslations(id: number, data: UpdateTestSetBodyType) {
    const { translations, ...fields } = data
    return this.prisma.$transaction(async (tx) => {
      const testSet = await tx.testSet.update({ where: { id }, data: fields })
      if (translations) {
        const languageIds = await this.languageIds(
          tx,
          translations.map((t) => t.language_code)
        )
        for (const t of translations) {
          const languageId = languageIds.get(t.language_code)
          if (languageId) {
            await this.upsertTranslation(
              tx,
              `${meaningPrefix(id, t.field)}1`,
              languageId,
              t.value
            )
          }
        }
      }
      return testSet
    })
  }

  // Upsert body after validation: creates or updates the test set, writes its
  // meanings, edits the questions and relinks them in the given order
  saveWithQuestions(input: {
    id?: number
    userId: number
    fields: TestSetFields
    meanings?: TestSetMeaning[]
    questions: UpsertQuestion[]
  }) {
    return this.prisma.$transaction(async (tx) => {
      const testSet = input.id
        ? await tx.testSet.update({ where: { id: input.id }, data: input.fields })
        : await this.createRow(tx, input.fields, input.userId)
      if (input.meanings?.length) await this.writeMeanings(tx, testSet.id, input.meanings)

      if (input.questions.length > 0) {
        for (const question of input.questions) {
          if (question.edit) {
            await tx.questionBank.update({
              where: { id: question.questionBankId },
              data: question.edit
            })
          }
          if (question.questionKey && question.meanings?.length) {
            await this.writeQuestionMeanings(tx, question.questionKey, question.meanings)
          }
        }
        if (input.id) {
          await tx.testSetQuestionBank.deleteMany({ where: { testSetId: testSet.id } })
        }
        await tx.testSetQuestionBank.createMany({
          data: input.questions.map((q, i) => ({
            testSetId: testSet.id,
            questionBankId: q.questionBankId,
            questionOrder: i + 1
          }))
        })
      }

      return tx.testSet.findUnique({
        where: { id: testSet.id },
        include: {
          testSetQuestionBanks: {
            include: {
              questionBank: {
                select: {
                  id: true,
                  questionJp: true,
                  questionType: true,
                  audioUrl: true,
                  pronunciation: true,
                  role: true,
                  levelN: true,
                  questionKey: true
                }
              }
            },
            orderBy: { questionOrder: 'asc' }
          }
        }
      })
    })
  }

  // name/description as [{ vi, en, ... }] and each question with its meanings
  async findWithQuestionBanksFull(id: number) {
    const testSet = await this.prisma.testSet.findUnique({
      where: { id },
      include: {
        testSetQuestionBanks: {
          include: { questionBank: true },
          orderBy: { questionOrder: 'asc' }
        }
      }
    })
    if (!testSet) return null

    const texts = await this.translationsLike(
      TEXT_FIELDS.map((f) => meaningPrefix(id, f))
    )
    const textOf = (field: TextField) => {
      const own = texts.filter((t) => t.key.startsWith(meaningPrefix(id, field)))
      return own.length > 0 ? [byLanguage(own)] : testSet[field]
    }

    const testSetQuestionBanks = await Promise.all(
      testSet.testSetQuestionBanks.map(async (link) => {
        const qb = link.questionBank
        return {
          id: link.id,
          questionOrder: link.questionOrder,
          questionBank: {
            id: qb.id,
            questionJp: qb.questionJp,
            questionType: qb.questionType,
            audioUrl: qb.audioUrl,
            pronunciation: qb.pronunciation,
            role: qb.role,
            levelN: qb.levelN,
            questionKey: qb.questionKey,
            meanings: byLanguage(await this.questionMeanings(qb.questionKey))
          }
        }
      })
    )

    return {
      id: testSet.id,
      name: textOf('name'),
      description: textOf('description'),
      content: testSet.content,
      audioUrl: testSet.audioUrl,
      price: testSet.price ? Number(testSet.price) : null,
      levelN: testSet.levelN,
      testType: testSet.testType,
      status: testSet.status,
      creatorId: testSet.creatorId,
      createdAt: testSet.createdAt,
      updatedAt: testSet.updatedAt,
      testSetQuestionBanks
    }
  }

  //#region helpers
  private toTestSet<T extends TestSet>(row: T) {
    return { ...row, price: row.price ? Number(row.price) : null }
  }

  // With a language: the first meaning in it (else the stored key) as a string.
  // Without: every meaning as [{ language, value }]
  private async withTexts(rows: TestSet[], language?: string): Promise<TestSetType[]> {
    if (rows.length === 0) return []
    const languageId = language
      ? (await this.prisma.languages.findFirst({ where: { code: language } }))?.id
      : undefined
    const translations = await this.translationsLike(
      rows.flatMap((row) => TEXT_FIELDS.map((f) => meaningPrefix(row.id, f))),
      languageId
    )
    return rows.map((row) => {
      const textOf = (field: TextField) => {
        const own = translations.filter((t) =>
          t.key.startsWith(meaningPrefix(row.id, field))
        )
        return language
          ? own[0]?.value || (row[field] ?? '')
          : own.map((t) => ({ language: t.language.code, value: t.value }))
      }
      return {
        ...this.toTestSet(row),
        name: textOf('name'),
        description: textOf('description')
      }
    })
  }

  private translationsLike(prefixes: string[], languageId?: number) {
    return this.prisma.translation.findMany({
      where: {
        OR: prefixes.map((prefix) => ({ key: { startsWith: prefix } })),
        ...(languageId && { languageId })
      },
      include: { language: { select: { code: true } } },
      orderBy: { key: 'asc' }
    })
  }

  // Test sets whose name or description (any language) contains the text
  private async idsWithTextLike(search: string): Promise<number[]> {
    const rows = await this.prisma.translation.findMany({
      where: {
        key: { startsWith: 'testset.' },
        value: { contains: search, mode: 'insensitive' }
      },
      select: { key: true }
    })
    const ids = rows.flatMap(({ key }) => {
      const [, id, field] = key.split('.')
      return TEXT_FIELDS.includes(field as TextField) ? [Number(id)] : []
    })
    return [...new Set(ids)]
  }

  // Meanings of a question; an old key ({type}.{id}.question) without any
  // falls back to the question.{type}.{id} format
  private async questionMeanings(questionKey: string | null) {
    if (!questionKey) return []
    const meanings = await this.translationsLike([`${questionKey}.meaning.`])
    if (meanings.length > 0 || !questionKey.includes('.question')) return meanings
    const parts = questionKey.replace('.question', '').split('.')
    const newKey =
      parts.length === 2 && parts[1] !== '' && Number.isInteger(Number(parts[1]))
        ? `question.${parts[0]}.${parts[1]}`
        : parts.join('.')
    return this.translationsLike([`${newKey}.meaning.`])
  }

  private async createRow(tx: Tx, fields: TestSetFields, userId: number) {
    // The name/description keys need the id: insert, then set them
    const created = await tx.testSet.create({
      data: { ...fields, name: 'temp', description: 'temp', creatorId: userId }
    })
    return tx.testSet.update({
      where: { id: created.id },
      data: {
        name: `testset.${created.id}.name`,
        description: `testset.${created.id}.description`
      }
    })
  }

  // Meaning i (1-based, over the whole array) of field f: testset.{id}.{f}.meaning.{i}
  private async writeMeanings(tx: Tx, id: number, meanings: TestSetMeaning[]) {
    const languageIds = await this.languageIds(
      tx,
      meanings.flatMap((m) => Object.keys(m.translations))
    )
    for (const [i, meaning] of meanings.entries()) {
      const key = `${meaningPrefix(id, meaning.field)}${i + 1}`
      for (const [code, value] of Object.entries(meaning.translations)) {
        const languageId = languageIds.get(code)
        if (languageId && value !== undefined) {
          await this.upsertTranslation(tx, key, languageId, value)
        }
      }
    }
  }

  // Reuses the question's meaning keys in order, adds new ones after them
  private async writeQuestionMeanings(
    tx: Tx,
    questionKey: string,
    meanings: { translations: Record<string, string> }[]
  ) {
    const existing = await tx.translation.findMany({
      where: { key: { startsWith: `${questionKey}.meaning.` } },
      select: { key: true },
      distinct: ['key'],
      orderBy: { key: 'asc' }
    })
    const keys = existing.map((t) => t.key).sort()
    const languageIds = await this.languageIds(
      tx,
      meanings.flatMap((m) => Object.keys(m.translations))
    )
    for (const [i, meaning] of meanings.entries()) {
      const key = keys[i] ?? `${questionKey}.meaning.${i + 1}`
      for (const [code, value] of Object.entries(meaning.translations)) {
        const languageId = languageIds.get(code)
        if (languageId) await this.upsertTranslation(tx, key, languageId, value)
      }
    }
  }

  private async languageIds(tx: Tx, codes: string[]): Promise<Map<string, number>> {
    const languages = await tx.languages.findMany({
      where: { code: { in: [...new Set(codes)] } },
      select: { id: true, code: true }
    })
    return new Map(languages.map((l) => [l.code, l.id]))
  }

  private upsertTranslation(tx: Tx, key: string, languageId: number, value: string) {
    return tx.translation.upsert({
      where: { languageId_key: { languageId, key } },
      update: { value },
      create: { languageId, key, value }
    })
  }
  //#endregion
}

const byLanguage = (rows: { language: { code: string }; value: string }[]) =>
  rows.reduce<Record<string, string>>((acc, row) => {
    acc[row.language.code] = row.value
    return acc
  }, {})
