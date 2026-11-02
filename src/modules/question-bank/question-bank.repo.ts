import {
  QuestionBankType,
  CreateQuestionBankBodyType,
  CreateQuestionBankWithMeaningsBodyType,
  UpdateQuestionBankWithMeaningsBodyType,
  UpdateQuestionBankBodyType,
  GetQuestionBankListQueryType
} from '@/modules/question-bank/entities/question-bank.entities'
import { PrismaService } from '@/shared/services/prisma.service'
import { Injectable, Logger } from '@nestjs/common'
import { pickLabelFromComposite } from '@/common/utils/prase.utils'
import { QuestionType } from '@prisma/client'

@Injectable()
export class QuestionBankRepository {
  private readonly logger = new Logger(QuestionBankRepository.name)

  constructor(private readonly prisma: PrismaService) {}

  async findMany(
    query: GetQuestionBankListQueryType
  ): Promise<{ data: QuestionBankType[]; total: number }> {
    const {
      currentPage,
      pageSize,
      levelN,
      questionType,
      search,
      sortBy = 'createdAt',
      sort = 'desc',
      language,
      testSetId,
      noTestSet
    } = query
    const skip = (currentPage - 1) * pageSize

    const where: any = {}

    if (search) {
      where.OR = [
        { questionJp: { contains: search, mode: 'insensitive' } },
        { questionKey: { contains: search, mode: 'insensitive' } },
        { pronunciation: { contains: search, mode: 'insensitive' } }
      ]
    }

    if (levelN) {
      where.levelN = levelN
    }

    if (questionType) {
      where.questionType = questionType
    }

    // Lọc theo testSetId - loại trừ những câu hỏi thuộc testSetId đó
    if (testSetId) {
      where.testSetQuestionBanks = {
        none: {
          testSetId: testSetId
        }
      }
    }

    // Lọc câu hỏi chưa có trong testSet nào
    if (noTestSet) {
      where.testSetQuestionBanks = {
        none: {}
      }
    }

    const orderBy: any = {}
    orderBy[sortBy] = sort

    const [questionBanks, total] = await Promise.all([
      this.prisma.questionBank.findMany({
        where,
        skip,
        take: pageSize,
        orderBy
      }),
      this.prisma.questionBank.count({ where })
    ])

    // Lấy translation cho từng question bank
    const data = await Promise.all(
      questionBanks.map(async (questionBank) => {
        if (questionBank.questionKey) {
          const translationWhere: any = {
            key: questionBank.questionKey
          }

          // Nếu có language, chỉ lấy translation của ngôn ngữ đó
          if (language) {
            const languageRecord = await this.prisma.languages.findFirst({
              where: { code: language }
            })
            if (languageRecord) {
              translationWhere.languageId = languageRecord.id
            }
          }

          // Tìm translation theo pattern meaning: question.VOCABULARY.99.meaning.*
          let translations = await this.prisma.translation.findMany({
            where: {
              ...translationWhere,
              key: { startsWith: questionBank.questionKey + '.meaning.' }
            },
            include: {
              language: true
            }
          })

          // Nếu không tìm thấy với key mới, thử tìm với key cũ (backward compatibility)
          if (translations.length === 0) {
            // Chuyển từ key mới sang key cũ: question.VOCABULARY.99 -> VOCABULARY.99.question
            const oldKey = questionBank.questionKey.replace(
              /^question\.(\w+)\.(\d+)$/,
              '$1.$2.question'
            )

            translations = await this.prisma.translation.findMany({
              where: {
                ...translationWhere,
                key: { startsWith: oldKey + '.meaning.' }
              },
              include: {
                language: true
              }
            })
          }

          // Nếu có language filter, chỉ lấy 1 translation
          if (language) {
            ;(questionBank as any).meaning =
              translations.length > 0 ? translations[0].value : ''
          } else {
            // Nếu không có language filter, lấy tất cả translations
            ;(questionBank as any).meanings =
              translations.length > 0
                ? translations.map((t) => ({
                    language: t.language.code,
                    value: t.value
                  }))
                : []
          }
        } else {
          // Nếu không có questionKey, vẫn set field rỗng
          if (language) {
            ;(questionBank as any).meaning = ''
          } else {
            ;(questionBank as any).meanings = []
          }
        }
        return questionBank
      })
    )

    return { data, total }
  }

  async findById(id: number): Promise<QuestionBankType | null> {
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

    if (!questionBank) {
      return null
    }

    // Lấy translation cho questionKey nếu có (trả về tất cả translations, không filter theo language)
    if (questionBank.questionKey) {
      // Tìm translation theo 2 pattern:
      // 1. Key chính xác: question.VOCABULARY.5
      // 2. Pattern meaning: question.VOCABULARY.5.meaning.*
      let translations = await this.prisma.translation.findMany({
        where: {
          OR: [
            { key: questionBank.questionKey }, // Key chính xác
            { key: { startsWith: questionBank.questionKey + '.meaning.' } } // Pattern meaning
          ]
        },
        include: {
          language: true
        }
      })

      // Nếu không tìm thấy và key có format cũ, thử tìm theo format mới
      if (translations.length === 0 && questionBank.questionKey.includes('.question')) {
        const newKey = questionBank.questionKey
          .replace('.question', '')
          .replace(/^(\w+)\.(\d+)$/, 'question.$1.$2')

        translations = await this.prisma.translation.findMany({
          where: {
            OR: [
              { key: newKey }, // Key chính xác mới
              { key: { startsWith: newKey + '.meaning.' } } // Pattern meaning mới
            ]
          },
          include: {
            language: true
          }
        })
      }

      // Trả về mảng translations (tất cả languages)
      ;(questionBank as any).meanings =
        translations.length > 0
          ? translations
              .filter((t) => t.key.startsWith(questionBank.questionKey! + '.meaning.'))
              .map((t) => ({
                language: t.language.code,
                value: t.value
              }))
          : []
    } else {
      // Nếu không có questionKey, vẫn set field rỗng
      ;(questionBank as any).meanings = []
    }

    return questionBank
  }

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

  async create(data: CreateQuestionBankBodyType): Promise<QuestionBankType> {
    return await this.prisma.questionBank.create({
      data
    })
  }

  async createWithMeanings(
    data: CreateQuestionBankWithMeaningsBodyType,
    userId: number
  ): Promise<QuestionBankType> {
    const { meanings, ...questionBankData } = data

    return await this.prisma.$transaction(async (tx) => {
      // Tạo question bank
      const questionBank = await tx.questionBank.create({
        data: questionBankData
      })

      // Tạo translations nếu có
      if (meanings && meanings.length > 0) {
        for (const meaning of meanings) {
          // Tạo translations cho từng ngôn ngữ
          for (const [languageCode, translation] of Object.entries(
            meaning.translations
          )) {
            // Tìm languageId từ languageCode
            const language = await tx.languages.findFirst({
              where: { code: languageCode }
            })

            if (language) {
              await tx.translation.upsert({
                where: {
                  languageId_key: {
                    languageId: language.id,
                    key: meaning.meaningKey!
                  }
                },
                update: {
                  value: translation
                },
                create: {
                  languageId: language.id,
                  key: meaning.meaningKey!,
                  value: translation
                }
              })
            }
          }
        }
      }

      return questionBank
    })
  }

  async update(id: number, data: UpdateQuestionBankBodyType): Promise<QuestionBankType> {
    return await this.prisma.questionBank.update({
      where: { id },
      data
    })
  }

  async updateWithMeanings(
    id: number,
    data: UpdateQuestionBankWithMeaningsBodyType
  ): Promise<QuestionBankType> {
    const { meanings, ...questionBankData } = data

    return await this.prisma.$transaction(async (tx) => {
      // Update question bank
      const questionBank = await tx.questionBank.update({
        where: { id },
        data: questionBankData
      })

      // Update translations nếu có
      if (meanings && meanings.length > 0) {
        for (const meaning of meanings) {
          // Tạo translations cho từng ngôn ngữ
          for (const [languageCode, translation] of Object.entries(
            meaning.translations
          )) {
            // Tìm languageId từ languageCode
            const language = await tx.languages.findFirst({
              where: { code: languageCode }
            })

            if (language) {
              await tx.translation.upsert({
                where: {
                  languageId_key: {
                    languageId: language.id,
                    key: meaning.meaningKey!
                  }
                },
                update: {
                  value: translation
                },
                create: {
                  languageId: language.id,
                  key: meaning.meaningKey!,
                  value: translation
                }
              })
            }
          }
        }
      }

      return questionBank
    })
  }

  async delete(id: number): Promise<QuestionBankType> {
    return await this.prisma.questionBank.delete({
      where: { id }
    })
  }

  async findByQuestionType(questionType: QuestionType): Promise<QuestionBankType[]> {
    return await this.prisma.questionBank.findMany({
      where: { questionType },
      orderBy: { id: 'asc' }
    })
  }

  async findByLevelN(levelN: number): Promise<QuestionBankType[]> {
    return await this.prisma.questionBank.findMany({
      where: { levelN },
      orderBy: { id: 'asc' }
    })
  }

  async findByTestSetId(testSetId: number): Promise<QuestionBankType[]> {
    return await this.prisma.questionBank.findMany({
      where: {
        testSetQuestionBanks: {
          some: {
            testSetId: testSetId
          }
        }
      },
      orderBy: { id: 'asc' }
    })
  }

  async getStatistics() {
    const [total, byType, byLevel] = await Promise.all([
      this.prisma.questionBank.count(),
      this.prisma.questionBank.groupBy({
        by: ['questionType'],
        _count: { questionType: true }
      }),
      this.prisma.questionBank.groupBy({
        by: ['levelN'],
        _count: { levelN: true }
      })
    ])

    return {
      total,
      byType: byType.reduce((acc, item) => {
        acc[item.questionType] = item._count.questionType
        return acc
      }, {}),
      byLevel: byLevel.reduce((acc, item) => {
        acc[`N${item.levelN}`] = item._count.levelN
        return acc
      }, {})
    }
  }

  /**
   * Đếm số câu hỏi theo từng levelN với cùng where clause (nhưng không filter theo levelN)
   */
  async countByLevelN(
    query: GetQuestionBankListQueryType
  ): Promise<{ N5: number; N4: number; N3: number; N2: number; N1: number }> {
    const { questionType, search, testSetId, noTestSet } = query

    const where: any = {}

    if (search) {
      where.OR = [
        { questionJp: { contains: search, mode: 'insensitive' } },
        { questionKey: { contains: search, mode: 'insensitive' } },
        { pronunciation: { contains: search, mode: 'insensitive' } }
      ]
    }

    // Không filter theo levelN để đếm tất cả các level
    // if (levelN) {
    //     where.levelN = levelN
    // }

    if (questionType) {
      where.questionType = questionType
    }

    // Lọc theo testSetId - loại trừ những câu hỏi thuộc testSetId đó
    if (testSetId) {
      where.testSetQuestionBanks = {
        none: {
          testSetId: testSetId
        }
      }
    }

    // Lọc câu hỏi chưa có trong testSet nào
    if (noTestSet) {
      where.testSetQuestionBanks = {
        none: {}
      }
    }

    // Đếm theo từng levelN
    const byLevel = await this.prisma.questionBank.groupBy({
      by: ['levelN'],
      where,
      _count: { levelN: true }
    })

    // Khởi tạo kết quả với giá trị mặc định
    const result = {
      N5: 0,
      N4: 0,
      N3: 0,
      N2: 0,
      N1: 0
    }

    // Cập nhật số lượng theo từng level
    byLevel.forEach((item) => {
      if (item.levelN === 5) result.N5 = item._count.levelN
      else if (item.levelN === 4) result.N4 = item._count.levelN
      else if (item.levelN === 3) result.N3 = item._count.levelN
      else if (item.levelN === 2) result.N2 = item._count.levelN
      else if (item.levelN === 1) result.N1 = item._count.levelN
    })

    return result
  }

  /**
   * Cập nhật questionKey cho question bank
   */
  async updateQuestionKey(id: number, questionKey: string): Promise<void> {
    await this.prisma.questionBank.update({
      where: { id },
      data: { questionKey }
    })
  }

  /**
   * Kiểm tra questionJp đã tồn tại chưa
   */
  async checkQuestionJpExists(questionJp: string, excludeId?: number): Promise<boolean> {
    const where: any = { questionJp }
    if (excludeId) {
      where.id = { not: excludeId }
    }

    const existing = await this.prisma.questionBank.findFirst({
      where
    })

    return !!existing
  }

  /**
   * Cập nhật key của translations
   */
  async updateTranslationKeys(oldKey: string, newKey: string): Promise<void> {
    await this.prisma.translation.updateMany({
      where: { key: oldKey },
      data: { key: newKey }
    })
  }

  /**
   * Xóa nhiều question bank cùng lúc và tự động xóa translations liên quan
   */
  async deleteMany(
    ids: number[]
  ): Promise<{ deletedCount: number; deletedIds: number[] }> {
    if (!ids || ids.length === 0) {
      return { deletedCount: 0, deletedIds: [] }
    }

    return await this.prisma.$transaction(async (tx) => {
      // Lấy thông tin question banks để lấy questionKey
      const questionBanks = await tx.questionBank.findMany({
        where: { id: { in: ids } },
        select: { id: true, questionKey: true }
      })

      const foundIds = questionBanks.map((qb) => qb.id)
      const questionKeys = questionBanks
        .filter((qb) => qb.questionKey)
        .map((qb) => qb.questionKey!)

      // Xóa translations liên quan (nếu có questionKey)
      if (questionKeys.length > 0) {
        // Tạo array các pattern để xóa
        const keyPatterns = questionKeys.flatMap((key) => [
          { key: { equals: key } }, // Key chính xác
          { key: { startsWith: key + '.meaning.' } } // Pattern meaning
        ])

        await tx.translation.deleteMany({
          where: {
            OR: keyPatterns
          }
        })
      }

      // Xóa question banks
      const deleteResult = await tx.questionBank.deleteMany({
        where: { id: { in: foundIds } }
      })

      return {
        deletedCount: deleteResult.count,
        deletedIds: foundIds
      }
    })
  }

  /**
   * Random lấy ra các câu hỏi theo số lượng và levelN
   * Chỉ lấy các câu có questionType: VOCABULARY, GRAMMAR, KANJI
   */
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
}
