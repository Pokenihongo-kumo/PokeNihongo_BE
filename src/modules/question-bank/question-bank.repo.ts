import {
  QuestionBankType,
  CreateQuestionBankWithMeaningsBodyType,
  UpdateQuestionBankWithMeaningsBodyType,
  GetQuestionBankListQueryType
} from '@/modules/question-bank/entities/question-bank.entity'
import { PrismaService } from '@/shared/services/prisma.service'
import { Injectable } from '@nestjs/common'
import { pickLabelFromComposite } from '@/common/utils/prase.utils'
import { toSkipTake } from '@/shared/utils/pagination'
import { Prisma, QuestionBank } from '@prisma/client'

type Tx = Prisma.TransactionClient
type Meaning = { meaningKey?: string | null; translations: Record<string, string> }

// questionKey of a new question: question.{type}.{id}
export const questionKeyOf = (id: number, questionType: string) =>
  `question.${questionType}.${id}`

// Meanings live at {questionKey}.meaning.{n}. Older rows used {type}.{id}.question:
// the other format is tried when a key has no meaning of its own
const otherKeyFormat = (questionKey: string): string | null => {
  const parts = questionKey.split('.')
  if (parts.length === 3 && parts[0] === 'question')
    return `${parts[1]}.${parts[2]}.question`
  if (parts.length === 3 && parts[2] === 'question')
    return `question.${parts[0]}.${parts[1]}`
  return null
}

@Injectable()
export class QuestionBankRepo {
  constructor(private readonly prisma: PrismaService) {}

  // Each row gets `meaning` (first one in `language`, else '') when a language
  // is asked, or `meanings` [{ language, value }]
  async findMany(query: GetQuestionBankListQueryType) {
    const where = this.listWhere(query)
    const [rows, total] = await Promise.all([
      this.prisma.questionBank.findMany({
        where: { ...where, ...(query.levelN && { levelN: query.levelN }) },
        ...toSkipTake(query.currentPage, query.pageSize),
        orderBy: { [query.sortBy]: query.sort }
      }),
      this.prisma.questionBank.count({
        where: { ...where, ...(query.levelN && { levelN: query.levelN }) }
      })
    ])

    const languageId = query.language
      ? (await this.prisma.languages.findFirst({ where: { code: query.language } }))?.id
      : undefined
    const meaningsOf = await this.meaningsByKey(
      rows.map((r) => r.questionKey),
      languageId
    )
    const data = rows.map((row) => {
      const meanings = meaningsOf(row.questionKey)
      return query.language
        ? { ...row, meaning: meanings[0]?.value ?? '' }
        : {
            ...row,
            meanings: meanings.map((t) => ({ language: t.language.code, value: t.value }))
          }
    })
    return { data, total }
  }

  // Same filters as the list, every level (for the N5..N1 counters)
  async countByLevelN(
    query: GetQuestionBankListQueryType
  ): Promise<{ N5: number; N4: number; N3: number; N2: number; N1: number }> {
    const byLevel = await this.prisma.questionBank.groupBy({
      by: ['levelN'],
      where: this.listWhere(query),
      _count: { levelN: true }
    })
    const count = (level: number) =>
      byLevel.find((item) => item.levelN === level)?._count.levelN ?? 0
    return { N5: count(5), N4: count(4), N3: count(3), N2: count(2), N1: count(1) }
  }

  // With answers, user logs, test sets and every meaning
  async findById(id: number) {
    const questionBank = await this.prisma.questionBank.findUnique({
      where: { id },
      include: {
        answers: true,
        userAnswerLogs: true,
        testSetQuestionBanks: {
          include: {
            testSet: {
              select: {
                id: true,
                name: true,
                testType: true
              }
            }
          }
        }
      }
    })
    if (!questionBank) return null

    const meanings = (await this.meaningsByKey([questionBank.questionKey]))(
      questionBank.questionKey
    )
    return {
      ...questionBank,
      meanings: meanings.map((t) => ({ language: t.language.code, value: t.value }))
    }
  }

  // Used by the match game (sockets): question text in the language, answers as
  // { id, answer } picked from the composite answerJp
  async findByIds(ids: number[], language?: string): Promise<QuestionBankType[]> {
    const questionBanks = await this.prisma.questionBank.findMany({
      where: {
        id: { in: ids }
      },
      include: {
        answers: true
      },
      orderBy: {
        id: 'asc'
      }
    })

    if (questionBanks.length === 0) {
      return []
    }

    // Lấy languageId nếu có language filter
    let languageId: number | undefined
    if (language) {
      const languageRecord = await this.prisma.languages.findFirst({
        where: { code: language }
      })
      if (languageRecord) {
        languageId = languageRecord.id
      }
    }

    // Lấy tất cả translations cho các questionBanks
    const questionKeys = questionBanks
      .map((qb) => qb.questionKey)
      .filter(Boolean) as string[]

    if (questionKeys.length === 0) {
      // Nếu không có questionKey nào, set meanings rỗng cho tất cả và transform answers
      const data = questionBanks.map((questionBank) => {
        const transformedAnswers = (questionBank.answers || []).map((ans: any) => {
          let answerText = ans.answerJp || ''
          if (language) {
            answerText =
              pickLabelFromComposite(ans.answerJp || '', language) || ans.answerJp || ''
          } else {
            answerText =
              pickLabelFromComposite(ans.answerJp || '', 'vi') || ans.answerJp || ''
          }
          return {
            id: ans.id,
            answer: answerText
          }
        })

        const {
          questionJp,
          questionKey,
          role,
          createdById,
          createdAt,
          updatedAt,
          answers,
          ...rest
        } = questionBank as any

        return {
          ...rest,
          question: questionBank.questionJp || '',
          answers: transformedAnswers
        }
      })
      return data
    }

    // Build where clause for translations
    const translationWhere: any = {
      OR: questionKeys.flatMap((key) => [
        { key: key },
        { key: { startsWith: key + '.meaning.' } }
      ])
    }

    if (languageId) {
      translationWhere.languageId = languageId
    }

    const allTranslations = await this.prisma.translation.findMany({
      where: translationWhere,
      include: {
        language: true
      }
    })

    // Map translations to each questionBank
    const data = await Promise.all(
      questionBanks.map(async (questionBank) => {
        let questionText = questionBank.questionJp || ''

        if (questionBank.questionKey) {
          // Tìm translations cho questionBank này
          const questionTranslations = allTranslations.filter(
            (t) =>
              t.key === questionBank.questionKey ||
              t.key.startsWith(questionBank.questionKey + '.meaning.')
          )

          // Nếu không tìm thấy và key có format cũ, thử tìm theo format mới
          if (
            questionTranslations.length === 0 &&
            questionBank.questionKey.includes('.question')
          ) {
            const newKey = questionBank.questionKey
              .replace('.question', '')
              .replace(/^(\w+)\.(\d+)$/, 'question.$1.$2')
            const newTranslations = allTranslations.filter(
              (t) => t.key === newKey || t.key.startsWith(newKey + '.meaning.')
            )

            if (newTranslations.length > 0) {
              // Xử lý với newTranslations
              if (languageId) {
                // Nếu có language filter, lấy translation của ngôn ngữ đó
                const meaningTranslation = newTranslations.find((t) =>
                  t.key.startsWith(newKey + '.meaning.')
                )
                if (meaningTranslation && meaningTranslation.value) {
                  questionText = meaningTranslation.value
                }
              } else {
                // Nếu không có language filter, lấy translation đầu tiên
                const meaningTranslation = newTranslations.filter((t) =>
                  t.key.startsWith(newKey + '.meaning.')
                )[0]
                if (meaningTranslation && meaningTranslation.value) {
                  questionText = meaningTranslation.value
                }
              }
            }
          } else {
            // Xử lý translations
            if (languageId) {
              // Nếu có language filter, chỉ lấy translation của ngôn ngữ đó
              const meaningTranslation = questionTranslations.find((t) =>
                t.key.startsWith(questionBank.questionKey! + '.meaning.')
              )
              if (meaningTranslation && meaningTranslation.value) {
                questionText = meaningTranslation.value
              }
            } else {
              // Nếu không có language filter, lấy translation đầu tiên
              const meaningTranslation = questionTranslations.filter((t) =>
                t.key.startsWith(questionBank.questionKey! + '.meaning.')
              )[0]
              if (meaningTranslation && meaningTranslation.value) {
                questionText = meaningTranslation.value
              }
            }
          }
        }

        // Transform answers: parse answerJp và loại bỏ các field không cần thiết
        const transformedAnswers = (questionBank.answers || []).map((ans: any) => {
          // Parse answerJp theo format jp:私+vi:Tôi+en:I
          let answerText = ans.answerJp || ''
          if (language) {
            answerText =
              pickLabelFromComposite(ans.answerJp || '', language) || ans.answerJp || ''
          } else {
            // Nếu không có language, lấy phần vi (fallback)
            answerText =
              pickLabelFromComposite(ans.answerJp || '', 'vi') || ans.answerJp || ''
          }

          return {
            id: ans.id,
            answer: answerText
          }
        })

        // Transform response: đổi questionJp thành question, loại bỏ các field không cần thiết
        const {
          questionJp,
          questionKey,
          role,
          createdById,
          createdAt,
          updatedAt,
          answers,
          ...rest
        } = questionBank as any

        return {
          ...rest,
          question: questionText,
          answers: transformedAnswers
        }
      })
    )

    return data
  }

  findByTestSetId(testSetId: number): Promise<QuestionBank[]> {
    return this.prisma.questionBank.findMany({
      where: { testSetQuestionBanks: { some: { testSetId } } },
      orderBy: { id: 'asc' }
    })
  }

  async questionJpTaken(questionJp: string, excludeId?: number): Promise<boolean> {
    const existing = await this.prisma.questionBank.findFirst({
      where: { questionJp, ...(excludeId && { id: { not: excludeId } }) },
      select: { id: true }
    })
    return !!existing
  }

  // Creates the question, gives it its questionKey (unless one is sent) and
  // writes the meanings, in one transaction
  createWithMeanings(data: CreateQuestionBankWithMeaningsBodyType, userId: number) {
    const { meanings, questionKey, ...fields } = data
    return this.prisma.$transaction(async (tx) => {
      const created = await tx.questionBank.create({
        data: { ...fields, questionKey: questionKey?.trim() || null, createdById: userId }
      })
      const questionBank = created.questionKey
        ? created
        : await tx.questionBank.update({
            where: { id: created.id },
            data: { questionKey: questionKeyOf(created.id, created.questionType) }
          })
      if (meanings?.length)
        await this.writeMeanings(tx, questionBank.questionKey!, meanings)
      return questionBank
    })
  }

  // A questionKey not in the question.{type}.{id} format is replaced by one
  updateWithMeanings(id: number, data: UpdateQuestionBankWithMeaningsBodyType) {
    const { meanings, ...fields } = data
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.questionBank.update({ where: { id }, data: fields })
      const questionBank = updated.questionKey?.startsWith('question.')
        ? updated
        : await tx.questionBank.update({
            where: { id },
            data: { questionKey: questionKeyOf(id, updated.questionType) }
          })
      if (meanings?.length)
        await this.writeMeanings(tx, questionBank.questionKey!, meanings)
      return questionBank
    })
  }

  // Deletes the question and its meanings; null when it does not exist
  async delete(id: number): Promise<QuestionBank | null> {
    const { deleted } = await this.deleteWithMeanings([id])
    return deleted[0] ?? null
  }

  // Up to 100 at a time; ids that do not exist are skipped
  async deleteMany(
    ids: number[]
  ): Promise<{ deletedCount: number; deletedIds: number[] }> {
    const { deleted } = await this.deleteWithMeanings(ids)
    return { deletedCount: deleted.length, deletedIds: deleted.map((q) => q.id) }
  }

  // Used by the match game: up to count VOCABULARY/GRAMMAR/KANJI questions of a level
  async getRandomQuestions(count: number, levelN: number): Promise<QuestionBankType[]> {
    // Lấy tất cả câu hỏi phù hợp với điều kiện
    const questions = await this.prisma.questionBank.findMany({
      where: {
        levelN,
        questionType: {
          in: ['VOCABULARY', 'GRAMMAR', 'KANJI']
        }
      }
    })

    // Nếu số câu hỏi ít hơn số lượng yêu cầu, trả về tất cả
    if (questions.length <= count) {
      return questions
    }

    // Random shuffle và lấy số lượng câu hỏi cần thiết
    const shuffled = questions.sort(() => Math.random() - 0.5)
    return shuffled.slice(0, count)
  }

  //#region helpers
  private listWhere(query: GetQuestionBankListQueryType): Prisma.QuestionBankWhereInput {
    const { search, questionType, testSetId, noTestSet } = query
    return {
      ...(search && {
        OR: [
          { questionJp: { contains: search, mode: 'insensitive' } },
          { questionKey: { contains: search, mode: 'insensitive' } },
          { pronunciation: { contains: search, mode: 'insensitive' } }
        ]
      }),
      ...(questionType && { questionType }),
      // noTestSet wins over testSetId (both filter the same relation)
      ...(testSetId && { testSetQuestionBanks: { none: { testSetId } } }),
      ...(noTestSet && { testSetQuestionBanks: { none: {} } })
    }
  }

  // One query for the meanings of every key; the returned function picks a
  // key's own meanings, else those under its other format
  private async meaningsByKey(keys: (string | null)[], languageId?: number) {
    const own = keys.filter((k): k is string => !!k)
    const prefixes = [...new Set(own.flatMap((k) => [k, otherKeyFormat(k)]))]
      .filter((k): k is string => !!k)
      .map((k) => `${k}.meaning.`)
    const translations = prefixes.length
      ? await this.prisma.translation.findMany({
          where: {
            OR: prefixes.map((prefix) => ({ key: { startsWith: prefix } })),
            ...(languageId && { languageId })
          },
          include: { language: { select: { code: true } } },
          orderBy: { key: 'asc' }
        })
      : []
    const under = (key: string) =>
      translations.filter((t) => t.key.startsWith(`${key}.meaning.`))
    return (key: string | null) => {
      if (!key) return []
      const mine = under(key)
      const other = otherKeyFormat(key)
      return mine.length > 0 || !other ? mine : under(other)
    }
  }

  // Meaning i goes to {questionKey}.meaning.{i}; a different meaningKey sent
  // by the client is cleared (its translations were moved there)
  private async writeMeanings(tx: Tx, questionKey: string, meanings: Meaning[]) {
    const languages = await tx.languages.findMany({
      where: {
        code: { in: [...new Set(meanings.flatMap((m) => Object.keys(m.translations)))] }
      },
      select: { id: true, code: true }
    })
    const languageIds = new Map(languages.map((l) => [l.code, l.id]))
    for (const [i, meaning] of meanings.entries()) {
      const key = `${questionKey}.meaning.${i + 1}`
      if (meaning.meaningKey && meaning.meaningKey !== key) {
        await tx.translation.deleteMany({ where: { key: meaning.meaningKey } })
      }
      for (const [code, value] of Object.entries(meaning.translations)) {
        const languageId = languageIds.get(code)
        if (!languageId) continue
        await tx.translation.upsert({
          where: { languageId_key: { languageId, key } },
          update: { value },
          create: { languageId, key, value }
        })
      }
    }
  }

  private deleteWithMeanings(ids: number[]) {
    return this.prisma.$transaction(async (tx) => {
      const deleted = await tx.questionBank.findMany({ where: { id: { in: ids } } })
      const keys = deleted.flatMap((q) => (q.questionKey ? [q.questionKey] : []))
      if (keys.length > 0) {
        await tx.translation.deleteMany({
          where: {
            OR: keys.flatMap((key) => [
              { key },
              { key: { startsWith: `${key}.meaning.` } }
            ])
          }
        })
      }
      await tx.questionBank.deleteMany({
        where: { id: { in: deleted.map((q) => q.id) } }
      })
      return { deleted }
    })
  }
  //#endregion
}
