import { HttpException, Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { UserTestRepo } from './user-test.repo'
import {
  CreateUserTestBodyType,
  UpdateUserTestBodyType,
  GetUserTestListQueryType,
  UserTestType
} from './entities/user-test.entity'
import { I18nService } from '@/i18n/i18n.service'
import { UserTestMessage as M } from '@/i18n/message-keys'
import { toPaginationMeta } from '@/shared/utils/pagination'
import { isNotFoundPrismaError } from '@/shared/utils/prisma-errors'
import {
  InvalidUserTestDataException,
  UserTestAlreadyExistsException,
  UserTestNotFoundException
} from './dto/user-test.error'
import { UserTestStatus, TestStatus } from '@prisma/client'
import { PrismaService } from '@/shared/services/prisma.service'
import { SharedUserSubscriptionService } from '@/shared/services/user-subscription.service'
import { FeatureKey, FeatureKeyType } from '@/common/constants/subscription.constant'

@Injectable()
export class UserTestService {
  private readonly logger = new Logger(UserTestService.name)

  constructor(
    private readonly userTestRepo: UserTestRepo,
    private readonly prisma: PrismaService,
    private readonly sharedUserSubscriptionService: SharedUserSubscriptionService,
    private readonly i18nService: I18nService
  ) {}

  private getDefaultUserTestStatus(test: {
    testType: TestStatus
    price?: number | null
  }): UserTestStatus {
    const priceValue =
      test.price !== undefined && test.price !== null ? Number(test.price) : 0
    if (test.testType === TestStatus.SUBSCRIPTION_TEST || priceValue > 0) {
      return UserTestStatus.NOT_STARTED
    }
    return UserTestStatus.ACTIVE
  }

  private getFeatureKeyByTestType(testType: TestStatus | string): FeatureKeyType | null {
    switch (testType) {
      case TestStatus.READING_TEST:
      case 'READING_TEST':
        return FeatureKey.UNLOCK_READING
      case TestStatus.LISTENING_TEST:
      case 'LISTENING_TEST':
        return FeatureKey.UNLOCK_LISTENING
      default:
        return null
    }
  }

  async create(body: CreateUserTestBodyType, lang: string = 'vi') {
    try {
      // Kiểm tra xem đã tồn tại UserTest cho user và test này chưa
      const existingUserTest = await this.userTestRepo.findByUserAndTest(
        Number(body.userId),
        Number(body.testId)
      )
      if (existingUserTest) {
        throw new UserTestAlreadyExistsException()
      }

      const userTest = await this.userTestRepo.create(body)

      return {
        statusCode: 201,
        data: userTest,
        message: this.i18nService.translate(M.CREATE_SUCCESS, lang)
      }
    } catch (error) {
      throw this.toUserTestError(error)
    }
  }

  // withTest (the app's /my): each row carries its test, translated to lang
  async findAll(query: GetUserTestListQueryType, lang: string = 'vi', withTest = false) {
    const language = withTest ? lang : undefined
    const normalizedQuery: GetUserTestListQueryType = {
      ...query,
      order: query.order ?? 'asc'
    }
    const result = await this.userTestRepo.findMany(normalizedQuery)

    let processedItems = result.items
    let testCache = new Map<number, any>()

    if (typeof normalizedQuery.userId === 'number' && result.items.length > 0) {
      const unlockResult = await this.unlockUserTestsBySubscription(
        result.items,
        normalizedQuery.userId,
        language
      )
      processedItems = unlockResult.userTests
      testCache = unlockResult.testCache
    }

    // Nếu có language, lấy thông tin Test với translations cho mỗi UserTest
    if (withTest && processedItems.length > 0) {
      const userTestsWithTestInfo = await Promise.all(
        processedItems.map(async (userTest) => {
          let test = testCache.get(userTest.testId)
          if (!test) {
            test = await this.userTestRepo.getTestById(userTest.testId, language)
            if (test) {
              testCache.set(userTest.testId, test)
            }
          }
          // Loại bỏ testId, createdAt, updatedAt và thêm thông tin test
          const { testId, createdAt, updatedAt, ...userTestWithoutIdAndDates } = userTest
          return {
            ...userTestWithoutIdAndDates,
            test: test
              ? {
                  id: test.id,
                  name: test.name,
                  description: test.description,
                  price: test.price,
                  levelN: test.levelN,
                  testType: test.testType,
                  status: test.status,
                  limit: test.limit
                }
              : null
          }
        })
      )
      return {
        statusCode: 200,
        message: this.i18nService.translate(M.GET_LIST_SUCCESS, lang),
        data: {
          results: userTestsWithTestInfo,
          pagination: toPaginationMeta(query.currentPage, query.pageSize, result.total)
        }
      }
    }

    return {
      statusCode: 200,
      message: this.i18nService.translate(M.GET_LIST_SUCCESS, lang),
      data: {
        results: processedItems,
        pagination: toPaginationMeta(query.currentPage, query.pageSize, result.total)
      }
    }
  }

  private async unlockUserTestsBySubscription(
    userTests: UserTestType[],
    userId: number,
    language?: string
  ): Promise<{ userTests: UserTestType[]; testCache: Map<number, any> }> {
    const featureAccessCache = new Map<FeatureKeyType, boolean>()
    const testCache = new Map<number, any>()
    const updatedUserTests: UserTestType[] = []

    for (const userTest of userTests) {
      let test = testCache.get(userTest.testId)
      if (!test) {
        test = await this.userTestRepo.getTestById(userTest.testId, language)
        if (test) {
          testCache.set(userTest.testId, test)
        }
      }

      if (!test) {
        updatedUserTests.push(userTest)
        continue
      }

      // Chỉ xử lý unlock cho những test có trả phí (price > 0)
      const testPrice =
        test.price !== undefined && test.price !== null ? Number(test.price) : 0
      if (testPrice === 0 || testPrice === null) {
        // Bỏ qua những test miễn phí, giữ nguyên status
        updatedUserTests.push(userTest)
        continue
      }

      const featureKey = this.getFeatureKeyByTestType(test.testType)
      if (!featureKey) {
        updatedUserTests.push(userTest)
        continue
      }

      let hasFeature: boolean
      if (featureAccessCache.has(featureKey)) {
        hasFeature = featureAccessCache.get(featureKey)!
      } else {
        hasFeature = await this.sharedUserSubscriptionService.getHasByfeatureKeyAndUserId(
          featureKey,
          userId
        )
        featureAccessCache.set(featureKey, hasFeature)
      }

      if (hasFeature) {
        if (userTest.status !== UserTestStatus.ACTIVE) {
          const updated = await this.userTestRepo.update(userTest.id, {
            status: UserTestStatus.ACTIVE
          })
          updatedUserTests.push(updated)
        } else {
          updatedUserTests.push(userTest)
        }
      } else {
        if (userTest.status !== UserTestStatus.NOT_STARTED) {
          const updated = await this.userTestRepo.update(userTest.id, {
            status: UserTestStatus.NOT_STARTED
          })
          updatedUserTests.push(updated)
        } else {
          updatedUserTests.push(userTest)
        }
      }
    }

    return { userTests: updatedUserTests, testCache }
  }

  async findOne(id: number, lang: string = 'vi') {
    const userTest = await this.userTestRepo.findById(id)
    if (!userTest) throw new UserTestNotFoundException()
    return {
      statusCode: 200,
      data: userTest,
      message: this.i18nService.translate(M.GET_SUCCESS, lang)
    }
  }

  async update(id: number, data: UpdateUserTestBodyType, lang: string = 'vi') {
    try {
      const userTest = await this.userTestRepo.update(id, data)
      return {
        statusCode: 200,
        data: userTest,
        message: this.i18nService.translate(M.UPDATE_SUCCESS, lang)
      }
    } catch (error) {
      throw this.toUserTestError(error)
    }
  }

  async delete(id: number, lang: string = 'vi') {
    try {
      await this.userTestRepo.delete(id)
      return {
        statusCode: 200,
        message: this.i18nService.translate(M.DELETE_SUCCESS, lang)
      }
    } catch (error) {
      throw this.toUserTestError(error)
    }
  }

  private toUserTestError(error: unknown): HttpException {
    if (error instanceof HttpException) return error
    this.logger.error(
      'User test request failed',
      error instanceof Error ? error.stack : error
    )
    if (isNotFoundPrismaError(error)) return new UserTestNotFoundException()
    return new InvalidUserTestDataException()
  }

  /**
   * Cập nhật status của tất cả user-test theo testId
   * Sử dụng khi admin đổi status của test (ACTIVE ↔ INACTIVE)
   */
  async updateStatusByTestId(testId: number, status: UserTestStatus): Promise<number> {
    try {
      this.logger.log(
        `Updating status of all user-tests for testId ${testId} to ${status}`
      )
      const count = await this.userTestRepo.updateStatusByTestId(testId, status)
      this.logger.log(`Successfully updated ${count} user-tests for testId ${testId}`)
      return count
    } catch (error) {
      this.logger.error(`Error updating user-test status for testId ${testId}:`, error)
      throw error
    }
  }

  /**
   * Khởi tạo UserTest cho user mới đăng ký
   * Add tất cả Test có status = ACTIVE (trừ MATCH_TEST) vào UserTest
   * Tạo mới hoặc cập nhật nếu đã tồn tại
   */
  async initUserTests(userId: number): Promise<void> {
    try {
      this.logger.log(`Initializing user tests for user ${userId}`)

      // Lấy tất cả Test có status = ACTIVE và KHÔNG phải MATCH_TEST
      const tests = await this.userTestRepo.getActiveTests()

      if (tests.length === 0) {
        this.logger.warn('No active tests found in the system')
        return
      }

      // Tạo UserTest cho tất cả test
      // SUBSCRIPTION_TEST -> status NOT_STARTED
      // Test khác -> status ACTIVE
      // Copy limit từ test vào UserTest
      const userTestData = tests.map((test) => ({
        userId,
        testId: test.id,
        status: this.getDefaultUserTestStatus(test),
        limit: test.limit
      }))

      // Sử dụng bulk upsert để tạo hoặc cập nhật UserTest
      await this.userTestRepo.bulkUpsert(userTestData)

      this.logger.log(
        `Successfully initialized ${userTestData.length} user test records for user ${userId}`
      )
    } catch (error) {
      this.logger.error(`Error initializing user tests for user ${userId}:`, error)
      // Không throw error để không ảnh hưởng đến quá trình tạo tài khoản
    }
  }

  /**
   * Khởi tạo UserTest cho TẤT CẢ user có trong hệ thống
   * Add tất cả Test có status = ACTIVE (trừ MATCH_TEST)
   * SUBSCRIPTION_TEST -> status NOT_STARTED, các test khác -> status ACTIVE
   */
  async initAllUsersTests(lang: string = 'vi'): Promise<any> {
    try {
      this.logger.log('Starting initialization of user tests for all users')

      // Lấy tất cả user có trong hệ thống
      const users = await this.userTestRepo.getAllUsers()

      if (users.length === 0) {
        this.logger.warn('No users found in the system')
        return {
          statusCode: 200,
          message: this.i18nService.translate(M.INIT_ALL_NO_USERS, lang),
          data: {
            totalUsers: 0,
            totalTestsAdded: 0
          }
        }
      }

      // Lấy tất cả Test có status = ACTIVE và KHÔNG phải MATCH_TEST
      const tests = await this.userTestRepo.getActiveTests()

      if (tests.length === 0) {
        this.logger.warn('No active tests found in the system')
        return {
          statusCode: 200,
          message: this.i18nService.translate(M.INIT_ALL_NO_TESTS, lang),
          data: {
            totalUsers: users.length,
            totalTestsAdded: 0
          }
        }
      }

      // Tạo UserTest cho tất cả user và tất cả test
      // SUBSCRIPTION_TEST -> status NOT_STARTED
      // Test khác -> status ACTIVE
      // Copy limit từ test vào UserTest
      const userTestData: Array<{
        userId: number
        testId: number
        status: UserTestStatus
        limit: number | null
      }> = []

      for (const user of users) {
        for (const test of tests) {
          userTestData.push({
            userId: user.id,
            testId: test.id,
            status: this.getDefaultUserTestStatus(test),
            limit: test.limit
          })
        }
      }

      // Sử dụng bulk upsert để tạo hoặc cập nhật UserTest
      await this.userTestRepo.bulkUpsert(userTestData)

      this.logger.log(
        `Successfully initialized user tests for ${users.length} users with ${tests.length} tests each`
      )

      return {
        statusCode: 200,
        message: this.i18nService.translate(M.INIT_ALL_SUCCESS, lang, {
          tests: tests.length,
          users: users.length
        }),
        data: {
          totalUsers: users.length,
          totalTests: tests.length,
          totalUserTests: userTestData.length
        }
      }
    } catch (error) {
      this.logger.error('Error initializing user tests for all users:', error)
      throw error
    }
  }

  // Hàm tự động cập nhật limit của UserTest theo Test (trừ PLACEMENT_TEST_DONE)
  // Chạy mỗi ngày lúc 00:00 giờ HCM (UTC+7)
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, {
    timeZone: 'Asia/Ho_Chi_Minh'
  })
  async runAutoTest(): Promise<void> {
    try {
      this.logger.log(
        '[UserTest Auto Limit Update] Starting automatic limit update for UserTest'
      )

      // Lấy tất cả Test có status = ACTIVE, KHÔNG phải MATCH_TEST và KHÔNG phải PLACEMENT_TEST_DONE
      const tests = await this.prisma.test.findMany({
        where: {
          status: 'ACTIVE',
          testType: {
            notIn: ['MATCH_TEST', 'PLACEMENT_TEST_DONE']
          }
        },
        select: {
          id: true,
          testType: true,
          limit: true
        }
      })

      if (tests.length === 0) {
        this.logger.warn('No tests found to update')
        return
      }

      let totalUpdated = 0

      // Cập nhật limit cho từng test
      for (const test of tests) {
        const result = await this.prisma.userTest.updateMany({
          where: {
            testId: test.id
          },
          data: {
            limit: test.limit
          }
        })

        totalUpdated += result.count
        this.logger.log(
          `Updated ${result.count} UserTest records for Test ID ${test.id} with limit ${test.limit}`
        )
      }

      this.logger.log(`Successfully updated ${totalUpdated} UserTest records`)
    } catch (error) {
      this.logger.error('Error running automatic limit update:', error)
    }
  }
}
