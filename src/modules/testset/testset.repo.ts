import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/shared/services/prisma.service'
import {
  TestSetType,
  CreateTestSetBodyType,
  UpdateTestSetBodyType,
  GetTestSetListQueryType,
  CreateTestSetWithMeaningsBodyType,
  UpdateTestSetWithMeaningsBodyType
} from './entities/testset.entity'
import { TestSetType as PrismaTestSetType } from '@prisma/client'

@Injectable()
export class TestSetRepo {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: CreateTestSetBodyType & { creatorId?: number }
  ): Promise<TestSetType> {
    const result = await this.prisma.testSet.create({
      data: {
        name: 'temp', // Sẽ được cập nhật trong service
        description: 'temp', // Sẽ được cập nhật trong service
        content: data.content,
        audioUrl: data.audioUrl,
        price: data.price,
        levelN: data.levelN,
        testType: data.testType,
        status: data.status,
        creatorId: data.creatorId
      }
    })
    return {
      ...result,
      price: result.price ? Number(result.price) : null,
      testType: result.testType as PrismaTestSetType
    }
  }

  async findById(id: number, language?: string): Promise<TestSetType | null> {
    const result = await this.prisma.testSet.findUnique({
      where: { id }
    })
    if (!result) return null

    const testSet = {
      ...result,
      price: result.price ? Number(result.price) : null,
      testType: result.testType as PrismaTestSetType
    }

    // Lấy translations cho name và description
    const nameKey = `testset.${id}.name`
    const descriptionKey = `testset.${id}.description`

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
      ;(testSet as any).name = nameTranslation?.value || result.name
      ;(testSet as any).description = descriptionTranslation?.value || result.description
    } else {
      // Nếu không có language filter, trả về mảng translations theo định dạng yêu cầu
      const nameTranslations = translations.filter((t) =>
        t.key.startsWith(nameKey + '.meaning.')
      )
      const descriptionTranslations = translations.filter((t) =>
        t.key.startsWith(descriptionKey + '.meaning.')
      )

      ;(testSet as any).name = nameTranslations.map((t) => ({
        language: t.language.code,
        value: t.value
      }))
      ;(testSet as any).description = descriptionTranslations.map((t) => ({
        language: t.language.code,
        value: t.value
      }))
    }

    return testSet
  }

  async findMany(
    query: GetTestSetListQueryType
  ): Promise<{ data: TestSetType[]; total: number }> {
    const {
      currentPage,
      pageSize,
      search,
      levelN,
      testType,
      status,
      creatorId,
      language,
      sortBy = 'createdAt',
      sort = 'desc',
      noExercies,
      noPrice
    } = query
    const skip = (currentPage - 1) * pageSize

    const where: any = {}

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } }
      ]
    }

    if (levelN) {
      where.levelN = levelN
    }

    if (testType) {
      where.testType = testType
    }

    if (status) {
      where.status = status
    }

    if (creatorId) {
      where.creatorId = creatorId
    }

    // Lọc testSet có price = 0 nếu noPrice = true
    if (noPrice === true) {
      where.price = 0
    }

    // Lọc testSet chưa có exercises nếu yêu cầu
    const extraWhere = noExercies ? { exercises: { none: {} } } : {}

    const orderBy: any = {}
    orderBy[sortBy] = sort

    const [rawData, total] = await Promise.all([
      this.prisma.testSet.findMany({
        where: { ...where, ...extraWhere },
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
              testSetQuestionBanks: true,
              exercises: true
            }
          }
        }
      }),
      this.prisma.testSet.count({ where: { ...where, ...extraWhere } })
    ])

    // Lấy translation cho từng testset
    const data = await Promise.all(
      rawData.map(async (testSet) => {
        const result = {
          ...testSet,
          price: testSet.price ? Number(testSet.price) : null,
          testType: testSet.testType as PrismaTestSetType,
          // Remove _count and creator from the response
          _count: undefined,
          creator: undefined
        }

        // Lấy translations cho name và description
        const nameKey = `testset.${testSet.id}.name`
        const descriptionKey = `testset.${testSet.id}.description`

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
          ;(result as any).name = nameTranslation?.value || testSet.name
          ;(result as any).description =
            descriptionTranslation?.value || testSet.description
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

  async findManyBasic(
    query: GetTestSetListQueryType
  ): Promise<{ data: TestSetType[]; total: number }> {
    const {
      currentPage,
      pageSize,
      search,
      levelN,
      testType,
      status,
      creatorId,
      language,
      sortBy = 'createdAt',
      sort = 'desc',
      noExercies,
      noPrice
    } = query
    const skip = (currentPage - 1) * pageSize

    const where: any = {}

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } }
      ]
    }

    if (levelN) {
      where.levelN = levelN
    }

    if (testType) {
      where.testType = testType
    }

    if (status) {
      where.status = status
    }

    if (creatorId) {
      where.creatorId = creatorId
    }

    // Lọc testSet có price = 0 nếu noPrice = true
    if (noPrice === true) {
      where.price = 0
    }

    // Lọc testSet chưa có exercises nếu yêu cầu
    const extraWhere = noExercies ? { exercises: { none: {} } } : {}

    const orderBy: any = {}
    orderBy[sortBy] = sort

    const [rawData, total] = await Promise.all([
      this.prisma.testSet.findMany({
        where: { ...where, ...extraWhere },
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
              testSetQuestionBanks: true,
              exercises: true
            }
          }
        }
      }),
      this.prisma.testSet.count({ where: { ...where, ...extraWhere } })
    ])

    // Lấy translation cho từng testset
    const data = await Promise.all(
      rawData.map(async (testSet) => {
        const result = {
          ...testSet,
          price: testSet.price ? Number(testSet.price) : null,
          testType: testSet.testType as PrismaTestSetType,
          // Remove _count and creator from the response
          _count: undefined,
          creator: undefined
        }

        // Lấy translations cho name và description
        const nameKey = `testset.${testSet.id}.name`
        const descriptionKey = `testset.${testSet.id}.description`

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
          ;(result as any).name = nameTranslation?.value || testSet.name
          ;(result as any).description =
            descriptionTranslation?.value || testSet.description
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

  async update(id: number, data: UpdateTestSetBodyType): Promise<TestSetType> {
    const result = await this.prisma.testSet.update({
      where: { id },
      data: {
        ...(data.content !== undefined && { content: data.content }),
        ...(data.audioUrl !== undefined && { audioUrl: data.audioUrl }),
        ...(data.price !== undefined && { price: data.price }),
        ...(data.levelN !== undefined && { levelN: data.levelN }),
        ...(data.testType && { testType: data.testType }),
        ...(data.status && { status: data.status })
      }
    })
    return {
      ...result,
      price: result.price ? Number(result.price) : null,
      testType: result.testType as PrismaTestSetType
    }
  }

  async delete(id: number): Promise<TestSetType> {
    const result = await this.prisma.testSet.delete({
      where: { id }
    })
    return {
      ...result,
      price: result.price ? Number(result.price) : null,
      testType: result.testType as PrismaTestSetType
    }
  }

  async createWithMeanings(
    data: CreateTestSetWithMeaningsBodyType,
    userId: number
  ): Promise<TestSetType> {
    const { meanings, ...testSetData } = data

    return await this.prisma.$transaction(async (tx) => {
      // Tạo testset tạm thời để lấy ID
      const testSet = await tx.testSet.create({
        data: {
          name: 'temp', // Tạm thời
          description: 'temp', // Tạm thời
          content: testSetData.content,
          audioUrl: testSetData.audioUrl,
          price: testSetData.price,
          levelN: testSetData.levelN,
          testType: testSetData.testType,
          status: testSetData.status,
          creatorId: userId
        }
      })

      // Tạo keys
      const nameKey = `testset.${testSet.id}.name`
      const descriptionKey = `testset.${testSet.id}.description`

      // Cập nhật testset với keys
      const updatedTestSet = await tx.testSet.update({
        where: { id: testSet.id },
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
        ...updatedTestSet,
        price: updatedTestSet.price ? Number(updatedTestSet.price) : null,
        testType: updatedTestSet.testType as PrismaTestSetType
      }
    })
  }

  async updateWithMeanings(
    id: number,
    data: UpdateTestSetWithMeaningsBodyType
  ): Promise<TestSetType> {
    const { meanings, ...testSetData } = data

    return await this.prisma.$transaction(async (tx) => {
      // Cập nhật testset
      const updatedTestSet = await tx.testSet.update({
        where: { id },
        data: {
          ...(testSetData.content !== undefined && { content: testSetData.content }),
          ...(testSetData.audioUrl !== undefined && { audioUrl: testSetData.audioUrl }),
          ...(testSetData.price !== undefined && { price: testSetData.price }),
          ...(testSetData.levelN !== undefined && { levelN: testSetData.levelN }),
          ...(testSetData.testType && { testType: testSetData.testType }),
          ...(testSetData.status && { status: testSetData.status })
        }
      })

      // Cập nhật translations nếu có
      if (meanings && meanings.length > 0) {
        const nameKey = `testset.${id}.name`
        const descriptionKey = `testset.${id}.description`

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
        ...updatedTestSet,
        price: updatedTestSet.price ? Number(updatedTestSet.price) : null,
        testType: updatedTestSet.testType as PrismaTestSetType
      }
    })
  }
}
