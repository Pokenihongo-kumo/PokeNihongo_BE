import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/shared/services/prisma.service'
import {
  TestType,
  CreateTestBodyType,
  UpdateTestBodyType,
  GetTestListQueryType,
  CreateTestWithMeaningsBodyType,
  UpdateTestWithMeaningsBodyType
} from './entities/test.entities'
import { TestStatus as PrismaTestStatus } from '@prisma/client'

@Injectable()
export class TestRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateTestBodyType & { creatorId?: number }): Promise<TestType> {
    const result = await this.prisma.test.create({
      data: {
        name: 'temp', // Sẽ được cập nhật trong service
        description: 'temp', // Sẽ được cập nhật trong service
        price: data.price,
        levelN: data.levelN,
        limit: data.limit,
        testType: data.testType,
        status: data.status,
        creatorId: data.creatorId
      }
    })
    return {
      ...result,
      price: result.price ? Number(result.price) : null,
      levelN: result.levelN,
      limit: result.limit,
      testType: result.testType as PrismaTestStatus
    }
  }

  async findById(id: number, language?: string): Promise<TestType | null> {
    const result = await this.prisma.test.findUnique({
      where: { id }
    })
    if (!result) return null

    const test = {
      ...result,
      price: result.price ? Number(result.price) : null,
      levelN: result.levelN,
      limit: result.limit,
      testType: result.testType as PrismaTestStatus
    }

    // Lấy translations cho name và description
    const nameKey = `test.${id}.name`
    const descriptionKey = `test.${id}.description`

    const translationWhere: any = {
      OR: [
        { key: nameKey },
        { key: descriptionKey },
        { key: { startsWith: nameKey + '.meaning.' } },
        { key: { startsWith: descriptionKey + '.meaning.' } }
      ]
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

    const translations = await this.prisma.translation.findMany({
      where: translationWhere,
      include: {
        language: true
      }
    })

    if (language) {
      // Nếu có language filter, chỉ lấy 1 translation cho name và description
      const nameTranslation = translations.find((t) =>
        t.key.startsWith(nameKey + '.meaning.')
      )
      const descriptionTranslation = translations.find((t) =>
        t.key.startsWith(descriptionKey + '.meaning.')
      )
      ;(test as any).name = nameTranslation?.value || result.name
      ;(test as any).description = descriptionTranslation?.value || result.description
    } else {
      // Nếu không có language filter, trả về mảng translations theo định dạng yêu cầu
      const nameTranslations = translations.filter((t) =>
        t.key.startsWith(nameKey + '.meaning.')
      )
      const descriptionTranslations = translations.filter((t) =>
        t.key.startsWith(descriptionKey + '.meaning.')
      )

      ;(test as any).name = nameTranslations.map((t) => ({
        language: t.language.code,
        value: t.value
      }))
      ;(test as any).description = descriptionTranslations.map((t) => ({
        language: t.language.code,
        value: t.value
      }))
    }

    // Lấy testSets của test này qua bảng TestTestSet (nhiều-nhiều)
    const testTestSets = await (this.prisma as any).testTestSet.findMany({
      where: {
        testId: id
      },
      include: {
        testSet: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    })
    const testSets = testTestSets.map((tts: any) => tts.testSet)

    // Lấy translations cho từng testSet
    const testSetsWithTranslations = await Promise.all(
      testSets.map(async (testSet) => {
        const testSetNameKey = `testset.${testSet.id}.name`
        const testSetDescriptionKey = `testset.${testSet.id}.description`

        const testSetTranslationWhere: any = {
          OR: [
            { key: testSetNameKey },
            { key: testSetDescriptionKey },
            { key: { startsWith: testSetNameKey + '.meaning.' } },
            { key: { startsWith: testSetDescriptionKey + '.meaning.' } }
          ]
        }

        if (language) {
          const languageRecord = await this.prisma.languages.findFirst({
            where: { code: language }
          })
          if (languageRecord) {
            testSetTranslationWhere.languageId = languageRecord.id
          }
        }

        const testSetTranslations = await this.prisma.translation.findMany({
          where: testSetTranslationWhere,
          include: {
            language: true
          }
        })

        let testSetName: any = testSet.name
        let testSetDescription: any = testSet.description

        if (language) {
          const nameTranslation = testSetTranslations.find((t) =>
            t.key.startsWith(testSetNameKey + '.meaning.')
          )
          const descriptionTranslation = testSetTranslations.find((t) =>
            t.key.startsWith(testSetDescriptionKey + '.meaning.')
          )
          testSetName = nameTranslation?.value || testSet.name
          testSetDescription = descriptionTranslation?.value || testSet.description
        } else {
          const nameTranslations = testSetTranslations.filter((t) =>
            t.key.startsWith(testSetNameKey + '.meaning.')
          )
          const descriptionTranslations = testSetTranslations.filter((t) =>
            t.key.startsWith(testSetDescriptionKey + '.meaning.')
          )
          testSetName = nameTranslations.map((t) => ({
            language: t.language.code,
            value: t.value
          }))
          testSetDescription = descriptionTranslations.map((t) => ({
            language: t.language.code,
            value: t.value
          }))
        }

        return {
          ...testSet,
          price: testSet.price ? Number(testSet.price) : null,
          name: testSetName,
          description: testSetDescription
        }
      })
    )

    ;(test as any).testSets = testSetsWithTranslations

    return test
  }

  async findMany(
    query: GetTestListQueryType
  ): Promise<{ data: TestType[]; total: number }> {
    const {
      currentPage,
      pageSize,
      search,
      testType,
      status,
      levelN,
      creatorId,
      language,
      sortBy = 'createdAt',
      sort = 'desc'
    } = query
    const skip = (currentPage - 1) * pageSize

    const where: any = {}

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ]
    }

    if (testType) {
      where.testType = testType
    }

    if (status) {
      where.status = status
    }

    if (levelN !== undefined) {
      where.levelN = levelN
    }

    if (creatorId) {
      where.creatorId = creatorId
    }

    const orderBy: any = {}
    orderBy[sortBy] = sort

    const [rawData, total] = await Promise.all([
      this.prisma.test.findMany({
        where,
        skip,
        take: pageSize,
        orderBy,
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          _count: {
            select: {
              testTestSets: true,
              userTestAttempts: true
            }
          }
        }
      }),
      this.prisma.test.count({ where })
    ])

    // Lấy translation cho từng test
    const data = await Promise.all(
      rawData.map(async (test) => {
        const result = {
          ...test,
          price: test.price ? Number(test.price) : null,
          levelN: test.levelN,
          limit: test.limit,
          testType: test.testType as PrismaTestStatus,
          // Remove _count and creator from the response
          _count: undefined,
          creator: undefined
        }

        // Lấy translations cho name và description
        const nameKey = `test.${test.id}.name`
        const descriptionKey = `test.${test.id}.description`

        const translationWhere: any = {
          OR: [
            { key: nameKey },
            { key: descriptionKey },
            { key: { startsWith: nameKey + '.meaning.' } },
            { key: { startsWith: descriptionKey + '.meaning.' } }
          ]
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

        const translations = await this.prisma.translation.findMany({
          where: translationWhere,
          include: {
            language: true
          }
        })

        if (language) {
          // Nếu có language filter, chỉ lấy 1 translation cho name và description
          const nameTranslation = translations.find((t) =>
            t.key.startsWith(nameKey + '.meaning.')
          )
          const descriptionTranslation = translations.find((t) =>
            t.key.startsWith(descriptionKey + '.meaning.')
          )
          ;(result as any).name = nameTranslation?.value || test.name
          ;(result as any).description = descriptionTranslation?.value || test.description
        } else {
          // Nếu không có language filter, trả về mảng translations theo định dạng yêu cầu
          const nameTranslations = translations.filter((t) =>
            t.key.startsWith(nameKey + '.meaning.')
          )
          const descriptionTranslations = translations.filter((t) =>
            t.key.startsWith(descriptionKey + '.meaning.')
          )

          ;(result as any).name = nameTranslations.map((t) => ({
            language: t.language.code,
            value: t.value
          }))
          ;(result as any).description = descriptionTranslations.map((t) => ({
            language: t.language.code,
            value: t.value
          }))
        }

        return result
      })
    )

    return { data, total }
  }

  async update(id: number, data: UpdateTestBodyType): Promise<TestType> {
    const result = await this.prisma.test.update({
      where: { id },
      data: {
        ...(data.price !== undefined && { price: data.price }),
        ...(data.levelN !== undefined && { levelN: data.levelN }),
        ...(data.testType && { testType: data.testType }),
        ...(data.status && { status: data.status })
      }
    })
    return {
      ...result,
      price: result.price ? Number(result.price) : null,
      levelN: result.levelN,
      limit: result.limit,
      testType: result.testType as PrismaTestStatus
    }
  }

  async delete(id: number): Promise<TestType> {
    const result = await this.prisma.test.delete({
      where: { id }
    })
    return {
      ...result,
      price: result.price ? Number(result.price) : null,
      levelN: result.levelN,
      limit: result.limit,
      testType: result.testType as PrismaTestStatus
    }
  }

  async deleteMany(
    ids: number[]
  ): Promise<{ deletedCount: number; deletedIds: number[] }> {
    if (!ids || ids.length === 0) {
      return { deletedCount: 0, deletedIds: [] }
    }

    return await this.prisma.$transaction(async (tx) => {
      // Lấy thông tin tests để lấy name và description keys
      const tests = await tx.test.findMany({
        where: { id: { in: ids } },
        select: { id: true, name: true, description: true }
      })

      const foundIds = tests.map((test) => test.id)

      // Xóa translations liên quan
      const nameKeys = tests.map((test) => `test.${test.id}.name`)
      const descriptionKeys = tests.map((test) => `test.${test.id}.description`)

      // Tạo patterns để xóa translations
      const keyPatterns = [
        ...nameKeys.flatMap((key) => [
          { key: { equals: key } },
          { key: { startsWith: key + '.meaning.' } }
        ]),
        ...descriptionKeys.flatMap((key) => [
          { key: { equals: key } },
          { key: { startsWith: key + '.meaning.' } }
        ])
      ]

      if (keyPatterns.length > 0) {
        await tx.translation.deleteMany({
          where: {
            OR: keyPatterns
          }
        })
      }

      // Xóa tests
      const deleteResult = await tx.test.deleteMany({
        where: { id: { in: foundIds } }
      })

      return {
        deletedCount: deleteResult.count,
        deletedIds: foundIds
      }
    })
  }

  async createWithMeanings(
    data: CreateTestWithMeaningsBodyType,
    userId: number
  ): Promise<TestType> {
    const { meanings, ...testData } = data

    return await this.prisma.$transaction(async (tx) => {
      // Tạo test tạm thời để lấy ID
      const test = await tx.test.create({
        data: {
          name: 'temp', // Tạm thời
          description: 'temp', // Tạm thời
          price: testData.price,
          levelN: testData.levelN,
          limit: testData.limit,
          testType: testData.testType,
          status: testData.status,
          creatorId: userId
        }
      })

      // Tạo keys
      const nameKey = `test.${test.id}.name`
      const descriptionKey = `test.${test.id}.description`

      // Cập nhật test với keys
      const updatedTest = await tx.test.update({
        where: { id: test.id },
        data: {
          name: nameKey,
          description: descriptionKey
        }
      })

      // Tạo translations nếu có
      if (meanings && meanings.length > 0) {
        for (let i = 0; i < meanings.length; i++) {
          const meaning = meanings[i]
          const baseKey = meaning.field === 'name' ? nameKey : descriptionKey
          const finalKey = `${baseKey}.meaning.${i + 1}`

          // Cập nhật meaningKey trong array
          meaning.meaningKey = finalKey

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
                    key: finalKey
                  }
                },
                update: { value: translation },
                create: {
                  languageId: language.id,
                  key: finalKey,
                  value: translation
                }
              })
            }
          }
        }
      }

      return {
        ...updatedTest,
        price: updatedTest.price ? Number(updatedTest.price) : null,
        levelN: updatedTest.levelN,
        limit: updatedTest.limit,
        testType: updatedTest.testType as PrismaTestStatus
      }
    })
  }

  async updateWithMeanings(
    id: number,
    data: UpdateTestWithMeaningsBodyType
  ): Promise<TestType> {
    const { meanings, ...testData } = data

    return await this.prisma.$transaction(async (tx) => {
      // Cập nhật test
      const updatedTest = await tx.test.update({
        where: { id },
        data: {
          ...(testData.price !== undefined && { price: testData.price }),
          ...(testData.levelN !== undefined && { levelN: testData.levelN }),
          ...(testData.limit !== undefined && { limit: testData.limit }),
          ...(testData.testType && { testType: testData.testType }),
          ...(testData.status && { status: testData.status })
        }
      })

      // Cập nhật translations nếu có
      if (meanings && meanings.length > 0) {
        const nameKey = `test.${id}.name`
        const descriptionKey = `test.${id}.description`

        for (let i = 0; i < meanings.length; i++) {
          const meaning = meanings[i]
          const baseKey = meaning.field === 'name' ? nameKey : descriptionKey
          const finalKey = `${baseKey}.meaning.${i + 1}`

          // Cập nhật meaningKey trong array
          meaning.meaningKey = finalKey

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
                    key: finalKey
                  }
                },
                update: { value: translation },
                create: {
                  languageId: language.id,
                  key: finalKey,
                  value: translation
                }
              })
            }
          }
        }
      }

      return {
        ...updatedTest,
        price: updatedTest.price ? Number(updatedTest.price) : null,
        levelN: updatedTest.levelN,
        limit: updatedTest.limit,
        testType: updatedTest.testType as PrismaTestStatus
      }
    })
  }

  async findByIdWithTestSetsAndQuestions(testId: number) {
    return this.prisma.test.findUnique({
      where: { id: testId },
      include: {
        testTestSets: {
          include: {
            testSet: {
              include: {
                testSetQuestionBanks: {
                  include: {
                    questionBank: {
                      include: {
                        answers: true
                      }
                    }
                  },
                  orderBy: {
                    questionOrder: 'asc'
                  }
                }
              }
            }
          }
        }
      }
    })
  }

  async findTestTestSetsWithTestSetAndCreator(testId: number) {
    return (this.prisma as any).testTestSet.findMany({
      where: { testId },
      include: {
        testSet: {
          include: {
            creator: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    })
  }
}
