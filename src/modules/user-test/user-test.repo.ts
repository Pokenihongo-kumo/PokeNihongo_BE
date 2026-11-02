import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/shared/services/prisma.service'
import {
  UserTestType,
  CreateUserTestBodyType,
  UpdateUserTestBodyType,
  GetUserTestListQueryType
} from './entities/user-test.entities'
import { UserTestStatus, TestSetStatus, TestStatus } from '@prisma/client'

@Injectable()
export class UserTestRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateUserTestBodyType): Promise<UserTestType> {
    const result = await this.prisma.userTest.create({
      data: {
        userId: Number(data.userId),
        testId: Number(data.testId),
        status: data.status || UserTestStatus.NOT_STARTED,
        limit: data.limit ?? null
      } as any
    })
    return result as UserTestType
  }

  async findById(id: number): Promise<UserTestType | null> {
    const result = await this.prisma.userTest.findUnique({
      where: { id }
    })
    return result as UserTestType | null
  }

  async findByUserAndTest(userId: number, testId: number): Promise<UserTestType | null> {
    const result = await this.prisma.userTest.findUnique({
      where: {
        userId_testId: {
          userId,
          testId
        }
      }
    })
    return result as UserTestType | null
  }

  async findMany(
    query: GetUserTestListQueryType
  ): Promise<{ items: UserTestType[]; total: number; page: number; limit: number }> {
    const {
      currentPage = 1,
      pageSize = 10,
      userId,
      testId,
      status,
      testType,
      order
    } = query
    const skip = (Number(currentPage) - 1) * Number(pageSize)
    const orderDirection = order === 'asc' ? 'asc' : 'desc'

    const where: any = {}

    if (userId) {
      where.userId = userId
    }

    if (testId) {
      where.testId = testId
    }

    if (status) {
      where.status = status
    }

    // Filter theo testType nếu có - cần join với bảng Test
    if (testType) {
      where.test = {
        testType: testType
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.userTest.findMany({
        where,
        skip,
        take: Number(pageSize),
        orderBy: [
          { status: 'desc' }, // ACTIVE trước (A) rồi đến NOT_STARTED (N)
          { createdAt: orderDirection }
        ]
      }),
      this.prisma.userTest.count({ where })
    ])

    return {
      items: items as UserTestType[],
      total,
      page: Number(currentPage),
      limit: Number(pageSize)
    }
  }

  async update(id: number, data: UpdateUserTestBodyType): Promise<UserTestType> {
    const result = await this.prisma.userTest.update({
      where: { id },
      data
    })
    return result as UserTestType
  }

  async delete(id: number): Promise<void> {
    await this.prisma.userTest.delete({
      where: { id }
    })
  }

  /**
   * Cập nhật status của tất cả user-test theo testId
   */
  async updateStatusByTestId(testId: number, status: UserTestStatus): Promise<number> {
    const result = await this.prisma.userTest.updateMany({
      where: {
        testId: testId
      },
      data: {
        status: status
      }
    })
    return result.count
  }

  /**
   * Giảm limit của UserTest và cập nhật status nếu cần
   */
  async decrementLimit(userId: number, testId: number): Promise<UserTestType | null> {
    // Lấy UserTest hiện tại
    const userTest = await this.findByUserAndTest(userId, testId)
    if (!userTest) {
      return null
    }

    // Nếu limit = null hoặc limit = 0, không giảm (không giới hạn)
    if (userTest.limit === null || userTest.limit === undefined || userTest.limit === 0) {
      return userTest
    }

    // Giảm limit
    const newLimit = userTest.limit - 1

    // Nếu giảm xuống còn 0, đổi status thành NOT_STARTED
    const updateData: any = { limit: newLimit }
    if (newLimit === 0) {
      updateData.status = UserTestStatus.NOT_STARTED
    }

    const result = await this.prisma.userTest.update({
      where: { id: userTest.id },
      data: updateData
    })

    return result as UserTestType
  }

  /**
   * Lấy tất cả Test có status = ACTIVE và KHÔNG phải MATCH_TEST
   */
  async getActiveTests(): Promise<
    { id: number; testType: TestStatus; limit: number | null; price: number | null }[]
  > {
    const tests = await this.prisma.test.findMany({
      where: {
        status: TestSetStatus.ACTIVE,
        testType: {
          not: TestStatus.MATCH_TEST // Không lấy MATCH_TEST
        }
      },
      select: {
        id: true,
        testType: true,
        limit: true,
        price: true
      },
      orderBy: {
        id: 'asc'
      }
    })

    return tests.map((test) => ({
      ...test,
      price: test.price ? Number(test.price) : null
    }))
  }

  /**
   * Tạo hàng loạt UserTest
   */
  async bulkCreate(
    data: Array<{
      userId: number
      testId: number
      status: UserTestStatus
      limit?: number | null
    }>
  ): Promise<void> {
    await this.prisma.userTest.createMany({
      data: data.map((item) => ({
        userId: item.userId,
        testId: item.testId,
        status: item.status,
        limit: item.limit ?? null
      })) as any,
      skipDuplicates: true // Bỏ qua nếu đã tồn tại
    })
  }

  /**
   * Tạo hoặc cập nhật hàng loạt UserTest (upsert)
   */
  async bulkUpsert(
    data: Array<{
      userId: number
      testId: number
      status: UserTestStatus
      limit?: number | null
    }>
  ): Promise<void> {
    // Thực hiện upsert cho từng item vì Prisma không support bulk upsert
    await Promise.all(
      data.map((item) =>
        this.prisma.userTest.upsert({
          where: {
            userId_testId: {
              userId: item.userId,
              testId: item.testId
            }
          },
          update: {
            status: item.status,
            limit: item.limit ?? null
          },
          create: {
            userId: item.userId,
            testId: item.testId,
            status: item.status,
            limit: item.limit ?? null
          } as any
        })
      )
    )
  }

  /**
   * Lấy tất cả user có trong hệ thống
   */
  async getAllUsers(): Promise<{ id: number }[]> {
    return await this.prisma.user.findMany({
      select: {
        id: true
      },
      where: {
        deletedAt: null // Chỉ lấy user chưa bị xóa
      },
      orderBy: {
        id: 'asc'
      }
    })
  }

  /**
   * Lấy thông tin Test theo ID với translations
   */
  async getTestById(testId: number, language?: string): Promise<any> {
    const test = await this.prisma.test.findUnique({
      where: { id: testId }
    })

    if (!test) return null

    const testInfo = {
      ...test,
      price: test.price ? Number(test.price) : null,
      levelN: test.levelN,
      testType: test.testType
    }

    // Lấy translations nếu có language
    if (language) {
      const nameKey = `test.${testId}.name`
      const descriptionKey = `test.${testId}.description`

      const translationWhere: any = {
        OR: [
          { key: { startsWith: nameKey + '.meaning.' } },
          { key: { startsWith: descriptionKey + '.meaning.' } }
        ]
      }

      const languageRecord = await this.prisma.languages.findFirst({
        where: { code: language }
      })
      if (languageRecord) {
        translationWhere.languageId = languageRecord.id
      }

      const translations = await this.prisma.translation.findMany({
        where: translationWhere,
        include: { language: true }
      })

      const nameTranslation = translations.find((t) =>
        t.key.startsWith(nameKey + '.meaning.')
      )
      const descriptionTranslation = translations.find((t) =>
        t.key.startsWith(descriptionKey + '.meaning.')
      )

      ;(testInfo as any).name = nameTranslation?.value || test.name
      ;(testInfo as any).description = descriptionTranslation?.value || test.description
    }

    return testInfo
  }
}
