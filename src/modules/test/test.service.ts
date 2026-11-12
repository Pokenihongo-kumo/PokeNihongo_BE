import { Injectable, BadRequestException, Logger } from '@nestjs/common'
import { TestRepo } from './test.repo'
import {
  CreateTestBodyType,
  UpdateTestBodyType,
  GetTestListQueryType,
  CreateTestWithMeaningsBodyType,
  UpdateTestWithMeaningsBodyType,
  DeleteManyTestsBodyType,
  AddTestSetsToTestBodyType,
  RemoveTestSetsFromTestBodyType
} from './entities/test.entity'
import { TestNotFoundException, TestPermissionDeniedException } from './dto/test.error'
import { PrismaService } from '@/shared/services/prisma.service'
import { MessageResDTO } from '@/shared/dtos/response.dto'
import { TEST_MESSAGE } from '@/common/constants/message'
import { TranslationService } from '../translation/translation.service'
import { LanguagesService } from '../languages/languages.service'
import { TestSetRepo } from '../testset/testset.repo'
import { TestSetNotFoundException } from '../testset/dto/testset.error'
import { TestSetQuestionBankService } from '../testset-questionbank/testset-questionbank.service'
import { UserTestAttemptRepository } from '../user-test-attempt/user-test-attempt.repo'
import { UserTestRepository } from '../user-test/user-test.repo'
import { UserTestService } from '../user-test/user-test.service'
import { TestStatus, UserTestStatus } from '@prisma/client'
import { ExercisesRepo } from '../exercises/exercises.repo'
import { pickLabelFromComposite } from '@/common/utils/prase.utils'

@Injectable()
export class TestService {
  private readonly logger = new Logger(TestService.name)

  constructor(
    private readonly testRepo: TestRepo,
    private readonly prisma: PrismaService,
    private readonly translationService: TranslationService,
    private readonly languagesService: LanguagesService,
    private readonly testSetRepo: TestSetRepo,
    private readonly testSetQuestionBankService: TestSetQuestionBankService,
    private readonly userTestAttemptRepo: UserTestAttemptRepository,
    private readonly userTestRepo: UserTestRepository,
    private readonly userTestService: UserTestService,
    private readonly exercisesRepo: ExercisesRepo
  ) {}

  private isValidUrl(url: string): boolean {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  private validateTestData(
    data: CreateTestBodyType | UpdateTestBodyType,
    isUpdate: boolean = false
  ): void {
    // Validation cho translations
    if (data.translations && Array.isArray(data.translations)) {
      if (data.translations.length === 0) {
        throw new BadRequestException('Phải có ít nhất 1 translation')
      }

      // Kiểm tra có ít nhất 1 translation cho name
      const hasNameTranslation = data.translations.some((t) => t.field === 'name')
      if (!hasNameTranslation) {
        throw new BadRequestException('Phải có ít nhất 1 translation cho name')
      }
    }

    if (data.testType !== undefined) {
      if (!data.testType) {
        throw new BadRequestException('Loại đề thi không được để trống')
      }
    }

    if (
      data.price !== undefined &&
      data.price !== null &&
      typeof data.price === 'number' &&
      data.price < 0
    ) {
      throw new BadRequestException('Giá bài test không được âm')
    }

    if (
      data.levelN !== undefined &&
      data.levelN !== null &&
      (data.levelN < 0 || data.levelN > 5)
    ) {
      throw new BadRequestException('Cấp độ JLPT phải từ 0 đến 5')
    }

    // Validation chỉ cho create (không phải update)
    if (!isUpdate) {
      const createData = data as CreateTestBodyType
      if (
        createData.name &&
        typeof createData.name === 'string' &&
        createData.name.trim().length === 0
      ) {
        throw new BadRequestException('Tên bài test không được để trống')
      }
      if (!createData.testType) {
        throw new BadRequestException('Loại đề thi không được để trống')
      }
    }
  }

  async createTest(data: CreateTestBodyType, userId: number): Promise<MessageResDTO> {
    try {
      // Validation
      this.validateTestData(data, false)

      // Kiểm tra nếu testType là PLACEMENT_TEST_DONE, chỉ cho phép tạo 1 test duy nhất trong toàn hệ thống
      if (data.testType === 'PLACEMENT_TEST_DONE') {
        const existingPlacementTest = await this.prisma.test.findFirst({
          where: {
            testType: 'PLACEMENT_TEST_DONE'
          }
        })

        if (existingPlacementTest) {
          throw new BadRequestException(
            'Chỉ được tạo 1 test PLACEMENT_TEST_DONE duy nhất trong toàn hệ thống'
          )
        }
      }

      // Tạo test với transaction
      const result = await this.prisma.$transaction(async (tx) => {
        // Tạo test tạm thời để lấy ID
        const test = await (tx as any).test.create({
          data: {
            name: 'temp', // Tạm thời
            description: 'temp', // Tạm thời
            price: data.price,
            levelN: data.levelN,
            limit: data.limit,
            testType: data.testType,
            status: data.status,
            creatorId: userId
          }
        })

        // Tạo keys
        const nameKey = `test.${test.id}.name`
        const descriptionKey = `test.${test.id}.description`

        // Cập nhật test với keys
        const updatedTest = await (tx as any).test.update({
          where: { id: test.id },
          data: {
            name: nameKey,
            description: descriptionKey
          }
        })

        // Tạo translations
        if (data.translations && Array.isArray(data.translations)) {
          for (const translation of data.translations) {
            const language = await this.languagesService.findByCode({
              code: translation.language_code
            })
            if (language?.data) {
              const key = translation.field === 'name' ? nameKey : descriptionKey
              await tx.translation.upsert({
                where: {
                  languageId_key: {
                    key: key,
                    languageId: language.data.id
                  }
                },
                update: { value: translation.value },
                create: {
                  key: key,
                  languageId: language.data.id,
                  value: translation.value
                }
              })
            }
          }
        }

        return updatedTest
      })

      return {
        statusCode: 201,
        data: result,
        message: TEST_MESSAGE.CREATE_SUCCESS
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error
      }
      this.logger.error('Error creating test:', error)
      throw new BadRequestException('Không thể tạo bài test')
    }
  }

  async findAll(query: GetTestListQueryType, lang?: string) {
    try {
      // Nếu lang là undefined (admin), repo sẽ lấy tất cả translations
      // Nếu lang có giá trị (user), repo sẽ filter theo language đó
      const { data, total } = await this.testRepo.findMany({ ...query, language: lang })
      const { currentPage, pageSize } = query
      const totalPage = Math.ceil(total / (typeof pageSize === 'number' ? pageSize : 10))

      return {
        statusCode: 200,
        data: {
          results: data,
          pagination: {
            current: currentPage,
            pageSize,
            totalPage,
            totalItem: total
          }
        },
        message: TEST_MESSAGE.GET_LIST_SUCCESS
      }
    } catch (error) {
      this.logger.error('Error finding tests:', error)
      throw new BadRequestException('Không thể lấy danh sách bài test')
    }
  }

  async findOne(id: number, lang: string) {
    try {
      const test = await this.testRepo.findById(id, lang)

      if (!test) {
        throw TestNotFoundException
      }

      return {
        statusCode: 200,
        data: test,
        message: TEST_MESSAGE.GET_SUCCESS
      }
    } catch (error) {
      this.logger.error('Error finding test by id:', error)
      if (error instanceof TestNotFoundException) {
        throw error
      }
      throw new BadRequestException('Không thể lấy thông tin bài test')
    }
  }

  async updateTest(
    id: number,
    data: UpdateTestBodyType,
    userId: number
  ): Promise<MessageResDTO> {
    const test = await this.testRepo.findById(id)

    if (!test) {
      throw TestNotFoundException
    }

    // Kiểm tra quyền sở hữu
    if (test.creatorId !== userId) {
      throw TestPermissionDeniedException
    }

    // Validation
    this.validateTestData(data, true)

    // Kiểm tra nếu đang update testType sang READING_TEST/LISTENING_TEST/SPEAKING_TEST
    // và test hiện tại có TestSet type khác thì không cho phép
    if (data.testType && data.testType !== test.testType) {
      const restrictedTestTypes = ['READING_TEST', 'LISTENING_TEST', 'SPEAKING_TEST']
      if (restrictedTestTypes.includes(data.testType)) {
        // Lấy tất cả TestSet hiện có trong test này
        const testTestSets = await (this.prisma as any).testTestSet.findMany({
          where: { testId: id },
          include: { testSet: true }
        })

        if (testTestSets.length > 0) {
          const allowedTestSetType = data.testType.replace('_TEST', '') // READING_TEST -> READING
          const invalidTestSets = testTestSets.filter(
            (tts: any) => tts.testSet.testType !== allowedTestSetType
          )

          if (invalidTestSets.length > 0) {
            const invalidIds = invalidTestSets.map((tts: any) => tts.testSet.id)
            throw new BadRequestException(
              `Không thể đổi testType sang ${data.testType} vì test đang chứa TestSet loại khác. ` +
                `Vui lòng xóa các TestSet không hợp lệ trước: ${invalidIds.join(', ')}`
            )
          }
        }
      }
    }

    // Lưu status cũ để so sánh
    const oldStatus = test.status

    // Cập nhật test với transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Cập nhật test
      const updatedTest = await (tx as any).test.update({
        where: { id },
        data: {
          ...(data.price !== undefined && { price: data.price }),
          ...(data.levelN !== undefined && { levelN: data.levelN }),
          ...(data.limit !== undefined && { limit: data.limit }),
          ...(data.testType && { testType: data.testType }),
          ...(data.status && { status: data.status })
        }
      })

      // Cập nhật translations nếu có
      if (data.translations && Array.isArray(data.translations)) {
        const nameKey = `test.${id}.name`
        const descriptionKey = `test.${id}.description`

        // Cập nhật translations
        for (const translation of data.translations) {
          const language = await this.languagesService.findByCode({
            code: translation.language_code
          })
          if (language?.data) {
            const key = translation.field === 'name' ? nameKey : descriptionKey
            await tx.translation.upsert({
              where: {
                languageId_key: {
                  key: key,
                  languageId: language.data.id
                }
              },
              update: { value: translation.value },
              create: {
                key: key,
                languageId: language.data.id,
                value: translation.value
              }
            })
          }
        }
      }

      return updatedTest
    })

    // Kiểm tra nếu status thay đổi (ACTIVE ↔ INACTIVE)
    const newStatus = data.status || oldStatus
    if (data.status && data.status !== oldStatus) {
      try {
        this.logger.log(
          `Test status changed from ${oldStatus} to ${newStatus} for testId ${id}`
        )

        if (newStatus === 'INACTIVE') {
          // Nếu test bị đổi thành INACTIVE, cập nhật tất cả user-test thành NOT_STARTED
          // (UserTestStatus không có INACTIVE, nên dùng NOT_STARTED để vô hiệu hóa)
          const updatedCount = await this.userTestService.updateStatusByTestId(
            id,
            UserTestStatus.NOT_STARTED
          )
          this.logger.log(
            `Updated ${updatedCount} user-tests to NOT_STARTED for testId ${id} (test is now INACTIVE)`
          )
        } else if (newStatus === 'ACTIVE') {
          // Nếu test được đổi thành ACTIVE, cập nhật user-test status dựa trên testType và price
          const targetTestType = data.testType || test.testType
          const updatedPrice = data.price !== undefined ? data.price : test.price
          const userTestStatus = this.getUserTestStatusForTest(
            targetTestType,
            updatedPrice
          )
          const updatedCount = await this.userTestService.updateStatusByTestId(
            id,
            userTestStatus
          )
          this.logger.log(
            `Updated ${updatedCount} user-tests to ${userTestStatus} for testId ${id}`
          )
        }
      } catch (statusUpdateError) {
        this.logger.error(
          'Error updating user-test status after test status change:',
          statusUpdateError
        )
      }
    }

    // Sau khi cập nhật test thành công, tự động cập nhật user-test cho tất cả users
    // (để đồng bộ status, limit, và các test ACTIVE mới)
    try {
      this.logger.log('Auto-initializing user tests for all users after updating test')
      await this.userTestService.initAllUsersTests()
      this.logger.log('Successfully initialized user tests for all users')
    } catch (initError) {
      // Log error nhưng không throw để không ảnh hưởng đến response update test
      this.logger.error('Error initializing user tests after updating test:', initError)
      // Có thể thêm thông báo warning vào response nếu cần
    }

    return {
      statusCode: 200,
      data: result,
      message: TEST_MESSAGE.UPDATE_SUCCESS
    }
  }

  async deleteTest(id: number, userId: number): Promise<MessageResDTO> {
    const test = await this.testRepo.findById(id)

    if (!test) {
      throw TestNotFoundException
    }

    // Kiểm tra quyền sở hữu
    if (test.creatorId !== userId) {
      throw TestPermissionDeniedException
    }

    await this.testRepo.delete(id)

    return {
      statusCode: 200,
      data: test,
      message: TEST_MESSAGE.DELETE_SUCCESS
    }
  }

  async deleteManyTests(
    data: DeleteManyTestsBodyType,
    userId: number
  ): Promise<MessageResDTO> {
    try {
      const { ids } = data

      // Validate input
      if (!ids || ids.length === 0) {
        throw new BadRequestException('Danh sách ID không được để trống')
      }

      // Kiểm tra giới hạn số lượng xóa cùng lúc
      if (ids.length > 100) {
        throw new BadRequestException('Chỉ được xóa tối đa 100 bài test cùng lúc')
      }

      // Lấy danh sách tests để kiểm tra quyền sở hữu
      const tests = await this.prisma.test.findMany({
        where: { id: { in: ids } },
        select: { id: true, creatorId: true }
      })

      // Kiểm tra xem có test nào không tồn tại không
      const foundIds = tests.map((test) => test.id)
      const notFoundIds = ids.filter((id) => !foundIds.includes(id))

      if (notFoundIds.length > 0) {
        throw new BadRequestException(
          `Không tìm thấy bài test với ID: ${notFoundIds.join(', ')}`
        )
      }

      // Kiểm tra quyền sở hữu - tất cả tests phải thuộc về user
      const unauthorizedTests = tests.filter((test) => test.creatorId !== userId)
      if (unauthorizedTests.length > 0) {
        throw TestPermissionDeniedException
      }

      // Xóa nhiều tests
      const result = await this.testRepo.deleteMany(ids)

      if (result.deletedCount === 0) {
        throw new BadRequestException('Không có bài test nào được xóa')
      }

      return {
        statusCode: 200,
        data: {
          deletedCount: result.deletedCount,
          deletedIds: result.deletedIds,
          requestedCount: ids.length,
          notFoundCount: ids.length - result.deletedCount
        },
        message: `Xóa thành công ${result.deletedCount}/${ids.length} bài test`
      }
    } catch (error) {
      this.logger.error('Error deleting many tests:', error)
      if (
        error instanceof BadRequestException ||
        error instanceof TestPermissionDeniedException
      ) {
        throw error
      }
      throw new BadRequestException('Không thể xóa nhiều bài test')
    }
  }

  private validateTestWithMeaningsData(
    data: CreateTestWithMeaningsBodyType | UpdateTestWithMeaningsBodyType,
    isUpdate: boolean = false
  ): void {
    // Validation cho meanings
    if (data.meanings && Array.isArray(data.meanings)) {
      if (data.meanings.length === 0) {
        throw new BadRequestException('Phải có ít nhất 1 meaning')
      }

      // Kiểm tra có ít nhất 1 meaning cho name
      const hasNameMeaning = data.meanings.some((m) => m.field === 'name')
      if (!hasNameMeaning) {
        throw new BadRequestException('Phải có ít nhất 1 meaning cho name')
      }
    }

    if (data.testType !== undefined) {
      if (!data.testType) {
        throw new BadRequestException('Loại đề thi không được để trống')
      }
    }

    if (
      data.price !== undefined &&
      data.price !== null &&
      typeof data.price === 'number' &&
      data.price < 0
    ) {
      throw new BadRequestException('Giá bài test không được âm')
    }

    if (
      data.levelN !== undefined &&
      data.levelN !== null &&
      (data.levelN < 0 || data.levelN > 5)
    ) {
      throw new BadRequestException('Cấp độ JLPT phải từ 0 đến 5')
    }

    // Validation chỉ cho create (không phải update)
    if (!isUpdate) {
      const createData = data as CreateTestWithMeaningsBodyType
      if (!createData.testType) {
        throw new BadRequestException('Loại đề thi không được để trống')
      }
    }
  }

  private getUserTestStatusForTest(
    testType: TestStatus | string,
    price?: number | null
  ): UserTestStatus {
    const normalizedPrice = price !== undefined && price !== null ? Number(price) : 0
    if (
      testType === TestStatus.SUBSCRIPTION_TEST ||
      testType === 'SUBSCRIPTION_TEST' ||
      normalizedPrice > 0
    ) {
      return UserTestStatus.NOT_STARTED
    }
    return UserTestStatus.ACTIVE
  }

  async createTestWithMeanings(
    data: CreateTestWithMeaningsBodyType,
    userId: number
  ): Promise<MessageResDTO> {
    try {
      // Validation
      this.validateTestWithMeaningsData(data, false)

      // Kiểm tra nếu testType là PLACEMENT_TEST_DONE, chỉ cho phép tạo 1 test duy nhất trong toàn hệ thống
      if (data.testType === 'PLACEMENT_TEST_DONE') {
        const existingPlacementTest = await this.prisma.test.findFirst({
          where: {
            testType: 'PLACEMENT_TEST_DONE'
          }
        })

        if (existingPlacementTest) {
          throw new BadRequestException(
            'Chỉ được tạo 1 test PLACEMENT_TEST_DONE duy nhất trong toàn hệ thống'
          )
        }
      }

      // Tạo test với meanings
      const result = await this.testRepo.createWithMeanings(data, userId)

      // Sau khi tạo test thành công, tự động thêm test này vào user-test cho tất cả users
      try {
        this.logger.log(
          'Auto-initializing user tests for all users after creating new test'
        )
        await this.userTestService.initAllUsersTests()
        this.logger.log('Successfully initialized user tests for all users')
      } catch (initError) {
        // Log error nhưng không throw để không ảnh hưởng đến response tạo test
        this.logger.error('Error initializing user tests after creating test:', initError)
        // Có thể thêm thông báo warning vào response nếu cần
      }

      return {
        statusCode: 201,
        data: result,
        message: TEST_MESSAGE.CREATE_SUCCESS
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error
      }
      this.logger.error('Error creating test with meanings:', error)
      throw new BadRequestException('Không thể tạo bài test với meanings')
    }
  }

  async updateTestWithMeanings(
    id: number,
    data: UpdateTestWithMeaningsBodyType,
    userId: number
  ): Promise<MessageResDTO> {
    const test = await this.testRepo.findById(id)

    if (!test) {
      throw TestNotFoundException
    }

    // Kiểm tra quyền sở hữu
    if (test.creatorId !== userId) {
      throw TestPermissionDeniedException
    }

    // Validation
    this.validateTestWithMeaningsData(data, true)

    // Kiểm tra nếu đang update testType sang READING_TEST/LISTENING_TEST/SPEAKING_TEST
    // và test hiện tại có TestSet type khác thì không cho phép
    if (data.testType && data.testType !== test.testType) {
      const restrictedTestTypes = ['READING_TEST', 'LISTENING_TEST', 'SPEAKING_TEST']
      if (restrictedTestTypes.includes(data.testType)) {
        // Lấy tất cả TestSet hiện có trong test này
        const testTestSets = await (this.prisma as any).testTestSet.findMany({
          where: { testId: id },
          include: { testSet: true }
        })

        if (testTestSets.length > 0) {
          const allowedTestSetType = data.testType.replace('_TEST', '') // READING_TEST -> READING
          const invalidTestSets = testTestSets.filter(
            (tts: any) => tts.testSet.testType !== allowedTestSetType
          )

          if (invalidTestSets.length > 0) {
            const invalidIds = invalidTestSets.map((tts: any) => tts.testSet.id)
            throw new BadRequestException(
              `Không thể đổi testType sang ${data.testType} vì test đang chứa TestSet loại khác. ` +
                `Vui lòng xóa các TestSet không hợp lệ trước: ${invalidIds.join(', ')}`
            )
          }
        }
      }
    }

    // Lưu status cũ để so sánh
    const oldStatus = test.status

    // Cập nhật test với meanings
    const result = await this.testRepo.updateWithMeanings(id, data)

    // Kiểm tra nếu status thay đổi (ACTIVE ↔ INACTIVE)
    const newStatus = data.status || oldStatus
    if (data.status && data.status !== oldStatus) {
      try {
        this.logger.log(
          `Test status changed from ${oldStatus} to ${newStatus} for testId ${id}`
        )

        if (newStatus === 'INACTIVE') {
          // Nếu test bị đổi thành INACTIVE, cập nhật tất cả user-test thành NOT_STARTED
          // (UserTestStatus không có INACTIVE, nên dùng NOT_STARTED để vô hiệu hóa)
          const updatedCount = await this.userTestService.updateStatusByTestId(
            id,
            UserTestStatus.NOT_STARTED
          )
          this.logger.log(
            `Updated ${updatedCount} user-tests to NOT_STARTED for testId ${id} (test is now INACTIVE)`
          )
        } else if (newStatus === 'ACTIVE') {
          // Nếu test được đổi thành ACTIVE, cập nhật user-test status dựa trên testType và price
          const targetTestType = data.testType || test.testType
          const updatedPrice = data.price !== undefined ? data.price : test.price
          const userTestStatus = this.getUserTestStatusForTest(
            targetTestType,
            updatedPrice
          )
          const updatedCount = await this.userTestService.updateStatusByTestId(
            id,
            userTestStatus
          )
          this.logger.log(
            `Updated ${updatedCount} user-tests to ${userTestStatus} for testId ${id}`
          )
        }
      } catch (statusUpdateError) {
        this.logger.error(
          'Error updating user-test status after test status change:',
          statusUpdateError
        )
      }
    }

    // Sau khi cập nhật test thành công, tự động cập nhật user-test cho tất cả users
    // (để đồng bộ status, limit, và các test ACTIVE mới)
    try {
      this.logger.log('Auto-initializing user tests for all users after updating test')
      await this.userTestService.initAllUsersTests()
      this.logger.log('Successfully initialized user tests for all users')
    } catch (initError) {
      // Log error nhưng không throw để không ảnh hưởng đến response update test
      this.logger.error('Error initializing user tests after updating test:', initError)
      // Có thể thêm thông báo warning vào response nếu cần
    }

    return {
      statusCode: 200,
      data: result,
      message: TEST_MESSAGE.UPDATE_SUCCESS
    }
  }

  async addTestSetsToTest(
    testId: number,
    data: AddTestSetsToTestBodyType
  ): Promise<MessageResDTO> {
    try {
      // Validate test tồn tại
      const test = await this.testRepo.findById(testId)
      if (!test) {
        throw TestNotFoundException
      }

      // Validate các TestSet tồn tại
      const testSets = await this.prisma.testSet.findMany({
        where: {
          id: { in: data.testSetIds }
        }
      })

      if (testSets.length !== data.testSetIds.length) {
        const foundIds = testSets.map((ts) => ts.id)
        const notFoundIds = data.testSetIds.filter((id) => !foundIds.includes(id))
        throw new BadRequestException(
          `Không tìm thấy TestSet với ID: ${notFoundIds.join(', ')}`
        )
      }

      // Kiểm tra nếu test là READING_TEST, LISTENING_TEST, hoặc SPEAKING_TEST
      // thì chỉ cho phép thêm TestSet có cùng type (READING, LISTENING, SPEAKING)
      // Validate cho LESSON_REVIEW: chỉ được thêm 3 loại VOCABULARY, GRAMMAR, KANJI
      if (test.testType === 'LESSON_REVIEW') {
        const allowedTestSetTypes = ['VOCABULARY', 'GRAMMAR', 'KANJI']
        const invalidTestSets = testSets.filter(
          (ts) => !allowedTestSetTypes.includes(ts.testType)
        )

        if (invalidTestSets.length > 0) {
          const invalidIds = invalidTestSets.map((ts) => ts.id)
          const invalidTypes = invalidTestSets.map((ts) => ts.testType).join(', ')
          throw new BadRequestException(
            `Test loại LESSON_REVIEW chỉ được thêm TestSet loại VOCABULARY, GRAMMAR, KANJI. ` +
              `TestSet không hợp lệ (ID: ${invalidIds.join(', ')}, Type: ${invalidTypes})`
          )
        }

        // Lấy danh sách testSet hiện có trong test
        const existingTestSets = await (this.prisma as any).testTestSet.findMany({
          where: { testId },
          include: { testSet: true }
        })
        const existingTestSetIds = existingTestSets.map((tts: any) => tts.testSetId)
        const existingTestSetTypes = existingTestSets.map(
          (tts: any) => tts.testSet.testType
        )

        // Lọc ra các testSet mới (chưa tồn tại)
        const newTestSetIds = data.testSetIds.filter(
          (id) => !existingTestSetIds.includes(id)
        )
        const newTestSets = testSets.filter((ts) => newTestSetIds.includes(ts.id))
        const newTestSetTypes = newTestSets.map((ts) => ts.testType)

        // Kiểm tra duplicate trong các testSet mới (không được có 2 testSet cùng loại trong 1 lần thêm)
        const newTypeCounts: Record<string, number> = {}
        for (const type of newTestSetTypes) {
          newTypeCounts[type] = (newTypeCounts[type] || 0) + 1
        }
        const duplicateNewTypes = Object.entries(newTypeCounts)
          .filter(([type, count]) => count > 1)
          .map(([type]) => type)
        if (duplicateNewTypes.length > 0) {
          throw new BadRequestException(
            `Không được thêm nhiều TestSet cùng loại trong 1 lần. ` +
              `Loại bị trùng: ${duplicateNewTypes.join(', ')}`
          )
        }

        // Kiểm tra duplicate với testSet đã tồn tại (không được có 2 testSet cùng loại)
        const allTestSetTypes = [...existingTestSetTypes, ...newTestSetTypes]
        const typeCounts: Record<string, number> = {}
        for (const type of allTestSetTypes) {
          typeCounts[type] = (typeCounts[type] || 0) + 1
        }
        const duplicateTypes = Object.entries(typeCounts)
          .filter(([type, count]) => count > 1)
          .map(([type]) => type)
        if (duplicateTypes.length > 0) {
          throw new BadRequestException(
            `Test LESSON_REVIEW chỉ được có 1 TestSet cho mỗi loại (VOCABULARY, GRAMMAR, KANJI). ` +
              `Loại bị trùng: ${duplicateTypes.join(', ')}`
          )
        }

        // Kiểm tra tổng số lượng: không được vượt quá 3
        const totalTestSets = existingTestSets.length + newTestSets.length
        if (totalTestSets > 3) {
          throw new BadRequestException(
            `Test LESSON_REVIEW chỉ được có tối đa 3 TestSet (VOCABULARY, GRAMMAR, KANJI). ` +
              `Hiện có ${existingTestSets.length}, đang cố thêm ${newTestSets.length}, tổng: ${totalTestSets}`
          )
        }
      }

      // Validate cho các testType khác: READING_TEST, LISTENING_TEST, SPEAKING_TEST
      const restrictedTestTypes = ['READING_TEST', 'LISTENING_TEST', 'SPEAKING_TEST']
      if (restrictedTestTypes.includes(test.testType)) {
        const allowedTestSetType = test.testType.replace('_TEST', '') // READING_TEST -> READING
        const invalidTestSets = testSets.filter(
          (ts) => ts.testType !== allowedTestSetType
        )

        if (invalidTestSets.length > 0) {
          const invalidIds = invalidTestSets.map((ts) => ts.id)
          throw new BadRequestException(
            `Test loại ${test.testType} chỉ được thêm TestSet loại ${allowedTestSetType}. ` +
              `TestSet không hợp lệ: ${invalidIds.join(', ')}`
          )
        }

        // Với SPEAKING_TEST: chỉ được có tối đa 1 TestSet SPEAKING
        if (test.testType === 'SPEAKING_TEST') {
          const existingSpeakingCount = await (this.prisma as any).testTestSet.count({
            where: {
              testId,
              testSet: { testType: 'SPEAKING' }
            }
          })
          const incomingSpeakingCount = testSets.filter(
            (ts) => ts.testType === 'SPEAKING'
          ).length
          if (existingSpeakingCount + incomingSpeakingCount > 1) {
            throw new BadRequestException(
              `Test SPEAKING_TEST chỉ được có tối đa 1 TestSet SPEAKING. ` +
                `Hiện có ${existingSpeakingCount}, đang cố thêm ${incomingSpeakingCount}.`
            )
          }
        }
      }

      // Kiểm tra các TestSet đang thuộc test khác, nếu có thì xóa khỏi test cũ
      const existingTestTestSets = await (this.prisma as any).testTestSet.findMany({
        where: {
          testSetId: { in: data.testSetIds },
          testId: { not: testId } // Chỉ lấy những testSet thuộc test khác
        }
      })

      if (existingTestTestSets.length > 0) {
        // Xóa các testSet khỏi test cũ
        const oldTestIds = [
          ...new Set(existingTestTestSets.map((tts: any) => tts.testId))
        ]
        const testSetIdsToRemove = existingTestTestSets.map((tts: any) => tts.testSetId)

        for (const oldTestId of oldTestIds) {
          await (this.prisma as any).testTestSet.deleteMany({
            where: {
              testId: oldTestId,
              testSetId: { in: testSetIdsToRemove }
            }
          })
        }

        this.logger.log(
          `Đã xóa ${existingTestTestSets.length} TestSet khỏi test cũ (testId: ${oldTestIds.join(', ')}) ` +
            `và sẽ thêm vào test mới (testId: ${testId})`
        )
      }

      // Tạo các bản ghi trong bảng TestTestSet (nhiều-nhiều)
      await (this.prisma as any).testTestSet.createMany({
        data: data.testSetIds.map((testSetId) => ({
          testId: testId,
          testSetId: testSetId
        })),
        skipDuplicates: true // Bỏ qua nếu đã tồn tại
      })

      return {
        statusCode: 200,
        data: {
          testId,
          addedTestSetIds: data.testSetIds,
          count: data.testSetIds.length
        },
        message: TEST_MESSAGE.ADD_TESTSETS_SUCCESS
      }
    } catch (error) {
      this.logger.error('Error adding testSets to test:', error)
      if (
        error instanceof TestNotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error
      }
      throw new BadRequestException('Không thể thêm TestSet vào Test')
    }
  }

  async addTestSetsToLessonReviewTest(
    lessonId: number,
    data: AddTestSetsToTestBodyType
  ): Promise<MessageResDTO> {
    try {
      // Tìm lesson theo lessonId
      const lesson = await this.prisma.lesson.findUnique({
        where: { id: lessonId },
        select: { id: true, testId: true }
      })

      if (!lesson) {
        throw new BadRequestException(`Không tìm thấy Lesson với ID: ${lessonId}`)
      }

      if (!lesson.testId) {
        throw new BadRequestException(
          `Lesson với ID ${lessonId} chưa có Test. Vui lòng tạo Test cho Lesson trước.`
        )
      }

      // Lấy danh sách testSet hiện có trong test
      const existingTestTestSets = await (this.prisma as any).testTestSet.findMany({
        where: { testId: lesson.testId },
        select: { testSetId: true }
      })
      const existingTestSetIds = existingTestTestSets.map((tts: any) => tts.testSetId)

      // Tìm những testSet không có trong mảng mới (cần xóa)
      const testSetIdsToRemove = existingTestSetIds.filter(
        (id: number) => !data.testSetIds.includes(id)
      )

      // Xóa các testSet cũ không có trong mảng mới
      if (testSetIdsToRemove.length > 0) {
        await this.removeTestSetsFromTest(lesson.testId, {
          testSetIds: testSetIdsToRemove
        })
        this.logger.log(
          `Đã xóa ${testSetIdsToRemove.length} TestSet cũ khỏi test (testId: ${lesson.testId}): ${testSetIdsToRemove.join(', ')}`
        )
      }

      // Gọi addTestSetsToTest với testId từ lesson để thêm các testSet mới
      return this.addTestSetsToTest(lesson.testId, data)
    } catch (error) {
      this.logger.error('Error adding testSets to lesson review test:', error)
      if (error instanceof BadRequestException) {
        throw error
      }
      throw new BadRequestException('Không thể thêm TestSet vào Lesson Review Test')
    }
  }

  async removeTestSetsFromTest(
    testId: number,
    data: RemoveTestSetsFromTestBodyType
  ): Promise<MessageResDTO> {
    try {
      // Validate test tồn tại
      const test = await this.testRepo.findById(testId)
      if (!test) {
        throw TestNotFoundException
      }

      // Validate các TestSet có trong Test này
      const testTestSets = await (this.prisma as any).testTestSet.findMany({
        where: {
          testId: testId,
          testSetId: { in: data.testSetIds }
        }
      })

      if (testTestSets.length === 0) {
        throw new BadRequestException('Không có TestSet nào trong Test này để xóa')
      }

      // Xóa các bản ghi trong bảng TestTestSet
      const deletedCount = await (this.prisma as any).testTestSet.deleteMany({
        where: {
          testId: testId,
          testSetId: { in: data.testSetIds }
        }
      })

      return {
        statusCode: 200,
        data: {
          testId,
          removedTestSetIds: data.testSetIds,
          count: deletedCount.count
        },
        message: TEST_MESSAGE.REMOVE_TESTSETS_SUCCESS
      }
    } catch (error) {
      this.logger.error('Error removing testSets from test:', error)
      if (
        error instanceof TestNotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error
      }
      throw new BadRequestException('Không thể xóa TestSet khỏi Test')
    }
  }

  async findFullById(testId: number, language: string = 'vi'): Promise<MessageResDTO> {
    try {
      this.logger.log(`Finding full test by ID: ${testId}, language: ${language}`)

      // Lấy thông tin Test cơ bản
      const test = await this.testRepo.findById(testId, language)
      if (!test) {
        throw TestNotFoundException
      }

      // Lấy các TestSets của Test qua TestTestSet
      const testTestSets = await (this.prisma as any).testTestSet.findMany({
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

      // Lấy translations và questions + answers cho từng TestSet
      const testSetsWithDetails = await Promise.all(
        testTestSets.map(async (testTestSet: any) => {
          const testSet = testTestSet.testSet

          // Lấy translations cho TestSet
          const testSetNameKey = `testset.${testSet.id}.name`
          const testSetDescriptionKey = `testset.${testSet.id}.description`
          const testSetContentKey = `testset.${testSet.id}.content`

          const testSetTranslationWhere: any = {
            OR: [
              { key: testSetNameKey },
              { key: testSetDescriptionKey },
              { key: testSetContentKey },
              { key: { startsWith: testSetNameKey + '.meaning.' } },
              { key: { startsWith: testSetDescriptionKey + '.meaning.' } },
              { key: { startsWith: testSetContentKey + '.meaning.' } }
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
            include: { language: true }
          })

          let testSetName: any = testSet.name
          let testSetDescription: any = testSet.description
          let testSetContent: any = testSet.content

          if (language) {
            const nameTranslation = testSetTranslations.find((t) =>
              t.key.startsWith(testSetNameKey + '.meaning.')
            )
            const descriptionTranslation = testSetTranslations.find((t) =>
              t.key.startsWith(testSetDescriptionKey + '.meaning.')
            )
            const contentTranslation = testSetTranslations.find((t) =>
              t.key.startsWith(testSetContentKey + '.meaning.')
            )

            testSetName = nameTranslation?.value || testSet.name
            testSetDescription = descriptionTranslation?.value || testSet.description
            testSetContent = contentTranslation?.value || testSet.content
          } else {
            const nameTranslations = testSetTranslations.filter((t) =>
              t.key.startsWith(testSetNameKey + '.meaning.')
            )
            const descriptionTranslations = testSetTranslations.filter((t) =>
              t.key.startsWith(testSetDescriptionKey + '.meaning.')
            )
            const contentTranslations = testSetTranslations.filter((t) =>
              t.key.startsWith(testSetContentKey + '.meaning.')
            )

            testSetName = nameTranslations.map((t) => ({
              language: t.language.code,
              value: t.value
            }))
            testSetDescription = descriptionTranslations.map((t) => ({
              language: t.language.code,
              value: t.value
            }))
            testSetContent = contentTranslations.map((t) => ({
              language: t.language.code,
              value: t.value
            }))
          }

          // Lấy questions + answers cho TestSet
          const questionsResult =
            await this.testSetQuestionBankService.findFullWithAnswerByTestSetId(
              testSet.id,
              language
            )
          const questions = questionsResult.data || []

          return {
            id: testSet.id,
            name: testSetName,
            description: testSetDescription,
            content: testSetContent,
            audioUrl: testSet.audioUrl,
            testType: testSet.testType,
            status: testSet.status,
            levelN: testSet.levelN,
            price: testSet.price ? Number(testSet.price) : null,
            creator: testSet.creator,
            questions: questions
          }
        })
      )

      const result = {
        ...test,
        testSets: testSetsWithDetails
      }

      return {
        statusCode: 200,
        data: result,
        message: TEST_MESSAGE.GET_SUCCESS
      }
    } catch (error) {
      this.logger.error('Error finding full test by ID:', error)
      if (error instanceof TestNotFoundException) {
        throw error
      }
      throw new BadRequestException('Không thể lấy thông tin bài test')
    }
  }

  async findFullByIdForUser(
    testId: number,
    language: string = 'vi'
  ): Promise<MessageResDTO> {
    try {
      this.logger.log(
        `Finding full test by ID for user: ${testId}, language: ${language}`
      )

      // Lấy thông tin Test cơ bản
      const test = await this.testRepo.findById(testId, language)
      if (!test) {
        throw TestNotFoundException
      }

      // Lấy các TestSets của Test qua TestTestSet (không include creator cho user)
      const testTestSets = await (this.prisma as any).testTestSet.findMany({
        where: { testId },
        include: {
          testSet: true
        },
        orderBy: { createdAt: 'asc' }
      })

      // Lấy translations và questions + answers cho từng TestSet
      const testSetsWithDetails = await Promise.all(
        testTestSets.map(async (testTestSet: any) => {
          const testSet = testTestSet.testSet

          // Lấy translations cho TestSet
          const testSetNameKey = `testset.${testSet.id}.name`
          const testSetDescriptionKey = `testset.${testSet.id}.description`
          const testSetContentKey = `testset.${testSet.id}.content`

          const testSetTranslationWhere: any = {
            OR: [
              { key: testSetNameKey },
              { key: testSetDescriptionKey },
              { key: testSetContentKey },
              { key: { startsWith: testSetNameKey + '.meaning.' } },
              { key: { startsWith: testSetDescriptionKey + '.meaning.' } },
              { key: { startsWith: testSetContentKey + '.meaning.' } }
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
            include: { language: true }
          })

          let testSetName: any = testSet.name
          let testSetDescription: any = testSet.description
          let testSetContent: any = testSet.content

          if (language) {
            const nameTranslation = testSetTranslations.find((t) =>
              t.key.startsWith(testSetNameKey + '.meaning.')
            )
            const descriptionTranslation = testSetTranslations.find((t) =>
              t.key.startsWith(testSetDescriptionKey + '.meaning.')
            )
            const contentTranslation = testSetTranslations.find((t) =>
              t.key.startsWith(testSetContentKey + '.meaning.')
            )

            testSetName = nameTranslation?.value || testSet.name
            testSetDescription = descriptionTranslation?.value || testSet.description
            testSetContent = contentTranslation?.value || testSet.content
          } else {
            const nameTranslations = testSetTranslations.filter((t) =>
              t.key.startsWith(testSetNameKey + '.meaning.')
            )
            const descriptionTranslations = testSetTranslations.filter((t) =>
              t.key.startsWith(testSetDescriptionKey + '.meaning.')
            )
            const contentTranslations = testSetTranslations.filter((t) =>
              t.key.startsWith(testSetContentKey + '.meaning.')
            )

            testSetName = nameTranslations.map((t) => ({
              language: t.language.code,
              value: t.value
            }))
            testSetDescription = descriptionTranslations.map((t) => ({
              language: t.language.code,
              value: t.value
            }))
            testSetContent = contentTranslations.map((t) => ({
              language: t.language.code,
              value: t.value
            }))
          }

          // Lấy questions + answers cho TestSet
          const questionsResult =
            await this.testSetQuestionBankService.findFullWithAnswerByTestSetId(
              testSet.id,
              language
            )
          const questions = questionsResult.data || []

          return {
            id: testSet.id,
            name: testSetName,
            description: testSetDescription,
            content: testSetContent,
            audioUrl: testSet.audioUrl,
            testType: testSet.testType,
            status: testSet.status,
            levelN: testSet.levelN,
            price: testSet.price ? Number(testSet.price) : null,
            questions: questions
          }
        })
      )

      // Loại bỏ createdAt, updatedAt, creatorId khỏi test object
      const { createdAt, updatedAt, creatorId, ...testWithoutTimestamps } = test as any

      const result = {
        ...testWithoutTimestamps,
        testSets: testSetsWithDetails
      }

      return {
        statusCode: 200,
        data: result,
        message: TEST_MESSAGE.GET_SUCCESS
      }
    } catch (error) {
      this.logger.error('Error finding full test by ID for user:', error)
      if (error instanceof TestNotFoundException) {
        throw error
      }
      throw new BadRequestException('Không thể lấy thông tin bài test')
    }
  }

  async findSpeakingTest(
    testId: number,
    language: string = 'vi'
  ): Promise<MessageResDTO> {
    try {
      this.logger.log(`Finding speaking test by ID: ${testId}, language: ${language}`)

      // Base test info
      const test = await this.testRepo.findById(testId, language)
      if (!test) {
        throw TestNotFoundException
      }

      // Get TestSets for this Test
      const testTestSets = await (this.prisma as any).testTestSet.findMany({
        where: { testId },
        include: { testSet: true },
        orderBy: { createdAt: 'asc' }
      })

      // Keep only SPEAKING test sets
      const speakingTestSets = testTestSets.filter(
        (tts: any) => tts.testSet?.testType === 'SPEAKING'
      )

      const testSetsWithQuestions = await Promise.all(
        speakingTestSets.map(async (tts: any) => {
          const ts = tts.testSet

          // Resolve translations to simple strings for name/description/content
          const testSetNameKey = `testset.${ts.id}.name`
          const testSetDescriptionKey = `testset.${ts.id}.description`
          const testSetContentKey = `testset.${ts.id}.content`

          let nameValue: any = ts.name
          let descriptionValue: any = ts.description

          if (language) {
            const languageRecord = await this.prisma.languages.findFirst({
              where: { code: language }
            })
            const languageId = languageRecord?.id
            if (languageId) {
              const translations = await this.prisma.translation.findMany({
                where: {
                  languageId,
                  OR: [
                    { key: { startsWith: testSetNameKey + '.meaning.' } },
                    { key: { startsWith: testSetDescriptionKey + '.meaning.' } },
                    { key: { startsWith: testSetContentKey + '.meaning.' } }
                  ]
                }
              })
              const nameT = translations.find((t) =>
                t.key.startsWith(testSetNameKey + '.meaning.')
              )
              const descT = translations.find((t) =>
                t.key.startsWith(testSetDescriptionKey + '.meaning.')
              )
              nameValue = nameT?.value || ts.name
              descriptionValue = descT?.value || ts.description
            }
          }

          // Get questions with answers (already ordered by questionOrder and localized)
          const questionsRes =
            await this.testSetQuestionBankService.findFullWithAnswerByTestSetId(
              ts.id,
              language
            )
          const questions = questionsRes.data || []

          return {
            id: ts.id,
            name: nameValue,
            description: descriptionValue,
            content: ts.content ?? null,
            audioUrl: ts.audioUrl ?? null,
            testType: ts.testType,
            status: ts.status,
            levelN: ts.levelN,
            price: ts.price ? Number(ts.price) : null,
            questions
          }
        })
      )

      return {
        statusCode: 200,
        data: {
          id: test.id,
          name: (test as any).name, // already localized by repo.findById
          description: (test as any).description,
          price: (test as any).price ?? 0,
          levelN: (test as any).levelN,
          limit: (test as any).limit,
          testType: (test as any).testType,
          status: (test as any).status,
          testSets: testSetsWithQuestions
        },
        message: TEST_MESSAGE.GET_SUCCESS
      }
    } catch (error) {
      this.logger.error('Error finding speaking test by ID:', error)
      if (error instanceof TestNotFoundException) {
        throw error
      }
      throw new BadRequestException('Không thể lấy thông tin bài test Speaking')
    }
  }

  async autoAddFreeTestSets(): Promise<MessageResDTO> {
    try {
      this.logger.log('Starting auto-add free testSets to PLACEMENT_TEST_DONE tests')

      // Tìm tất cả Test có type PLACEMENT_TEST_DONE
      const placementTests = await this.prisma.test.findMany({
        where: {
          testType: 'PLACEMENT_TEST_DONE',
          status: 'ACTIVE'
        },
        select: {
          id: true
        }
      })

      if (placementTests.length === 0) {
        this.logger.warn('No PLACEMENT_TEST_DONE tests found')
        return {
          statusCode: 200,
          data: {
            totalTests: 0,
            totalTestSetsAdded: 0
          },
          message: 'Không có Test PLACEMENT_TEST_DONE nào trong hệ thống'
        }
      }

      // Tìm tất cả TestSet có price = 0, status = ACTIVE, và testType là VOCABULARY, GRAMMAR, hoặc KANJI
      const freeTestSets = await this.prisma.testSet.findMany({
        where: {
          price: 0,
          status: 'ACTIVE',
          testType: {
            in: ['VOCABULARY', 'GRAMMAR', 'KANJI']
          }
        },
        select: {
          id: true
        }
      })

      if (freeTestSets.length === 0) {
        this.logger.warn('No free testSets found')
        return {
          statusCode: 200,
          data: {
            totalTests: placementTests.length,
            totalTestSetsAdded: 0
          },
          message: 'Không có TestSet free nào trong hệ thống'
        }
      }

      let totalAdded = 0

      // Thêm các TestSet free vào từng Test PLACEMENT_TEST_DONE
      for (const test of placementTests) {
        const testSetIds = freeTestSets.map((ts) => ts.id)

        // Lấy danh sách TestSet đã có trong Test này
        const existingTestTestSets = await (this.prisma as any).testTestSet.findMany({
          where: { testId: test.id },
          select: { testSetId: true }
        })

        const existingTestSetIds = existingTestTestSets.map((tts: any) => tts.testSetId)
        const newTestSetIds = testSetIds.filter((id) => !existingTestSetIds.includes(id))

        if (newTestSetIds.length > 0) {
          await (this.prisma as any).testTestSet.createMany({
            data: newTestSetIds.map((testSetId) => ({
              testId: test.id,
              testSetId: testSetId
            }))
          })

          totalAdded += newTestSetIds.length
          this.logger.log(`Added ${newTestSetIds.length} testSets to Test ID ${test.id}`)
        }
      }

      this.logger.log(
        `Successfully added ${totalAdded} testSets to ${placementTests.length} tests`
      )

      return {
        statusCode: 200,
        data: {
          totalTests: placementTests.length,
          totalTestSetsAdded: totalAdded
        },
        message: `Đã thêm ${totalAdded} TestSet vào ${placementTests.length} Test PLACEMENT_TEST_DONE`
      }
    } catch (error) {
      this.logger.error('Error auto-adding free testSets:', error)
      throw new BadRequestException('Không thể tự động thêm TestSet')
    }
  }

  async getRandomQuestionsForPlacementTest(
    testId: number,
    userId: number,
    language: string = 'vi'
  ): Promise<MessageResDTO> {
    try {
      this.logger.log(
        `Getting random questions for placement test: ${testId}, user: ${userId}, language: ${language}`
      )

      // Validate test tồn tại và là PLACEMENT_TEST_DONE
      const test = await this.testRepo.findById(testId)
      if (!test) {
        throw TestNotFoundException
      }

      if (test.testType !== 'PLACEMENT_TEST_DONE') {
        throw new BadRequestException(
          'Chỉ có thể lấy câu hỏi từ Test loại PLACEMENT_TEST_DONE'
        )
      }

      // Kiểm tra UserTest tồn tại và limit
      const userTest = await this.userTestRepo.findByUserAndTest(userId, testId)
      if (!userTest) {
        throw new BadRequestException('Bạn chưa có quyền làm bài test này')
      }

      // Lấy attempt được tạo gần nhất của userId và testId (không phân biệt status)
      const latestAttempt = await this.prisma.userTestAttempt.findFirst({
        where: {
          userId,
          testId
        },
        orderBy: {
          createdAt: 'desc' // Lấy attempt được tạo gần nhất
        }
      })

      let userTestAttempt

      // Nếu có attempt gần nhất và là IN_PROGRESS → dùng lại (xử lý trường hợp rớt mạng)
      if (latestAttempt && latestAttempt.status === 'IN_PROGRESS') {
        // Sử dụng attempt đó (không tạo mới, không giảm limit)
        // Xóa tất cả UserTestAnswerLog của attempt này để bắt đầu lại từ đầu
        this.logger.log(
          `Found existing IN_PROGRESS UserTestAttempt with ID: ${latestAttempt.id} for user ${userId} and test ${testId}`
        )

        const deletedLogsCount = await this.prisma.userTestAnswerLog.deleteMany({
          where: {
            userTestAttemptId: latestAttempt.id
          }
        })
        this.logger.log(
          `Deleted ${deletedLogsCount.count} UserTestAnswerLog for attempt ${latestAttempt.id}`
        )

        userTestAttempt = {
          id: latestAttempt.id,
          userId: latestAttempt.userId,
          testId: latestAttempt.testId,
          status: latestAttempt.status,
          time: latestAttempt.time,
          score: latestAttempt.score,
          createdAt: latestAttempt.createdAt,
          updatedAt: latestAttempt.updatedAt
        }
      } else {
        // Nếu attempt gần nhất là COMPLETED hoặc không có attempt nào (lần đầu) → tạo mới
        if (latestAttempt && latestAttempt.status === 'COMPLETED') {
          this.logger.log(
            `Found COMPLETED attempt (ID: ${latestAttempt.id}), creating new UserTestAttempt for user ${userId} and test ${testId}`
          )
        } else {
          this.logger.log(
            `No existing attempt found (first time), creating new UserTestAttempt for user ${userId} and test ${testId}`
          )
        }

        // Tạo UserTestAttempt mới (không giảm limit)
        userTestAttempt = await this.userTestAttemptRepo.create({
          userId,
          testId
        })

        this.logger.log(`Created new UserTestAttempt with ID: ${userTestAttempt.id}`)
      }

      // Lấy các TestSets của Test
      const testTestSets = await (this.prisma as any).testTestSet.findMany({
        where: { testId },
        select: { testSetId: true }
      })

      if (testTestSets.length === 0) {
        throw new BadRequestException('Test này chưa có TestSet nào')
      }

      const testSetIds = testTestSets.map((tts: any) => tts.testSetId)

      // Lấy tất cả câu hỏi từ các TestSets, nhóm theo levelN
      const allQuestions = await this.prisma.testSetQuestionBank.findMany({
        where: {
          testSetId: { in: testSetIds }
        },
        include: {
          questionBank: {
            include: {
              answers: true
            }
          }
        }
      })

      // Chỉ lấy các loại VOCABULARY, GRAMMAR, KANJI
      const filteredQuestions = allQuestions.filter((tsqb) =>
        ['VOCABULARY', 'GRAMMAR', 'KANJI'].includes(tsqb.questionBank.questionType)
      )

      // Nhóm câu hỏi theo levelN
      const questionsByLevel = {
        5: filteredQuestions.filter((q) => q.questionBank.levelN === 5),
        4: filteredQuestions.filter((q) => q.questionBank.levelN === 4),
        3: filteredQuestions.filter((q) => q.questionBank.levelN === 3),
        2: filteredQuestions.filter((q) => q.questionBank.levelN === 2),
        1: filteredQuestions.filter((q) => q.questionBank.levelN === 1)
      }

      // Shuffle và lấy số lượng câu hỏi theo tỷ lệ: 3 câu N5, 4 câu N4, 3 câu N3
      const shuffleArray = <T>(array: T[]): T[] => {
        const shuffled = [...array]
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1))
          ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
        }
        return shuffled
      }

      const getRandomQuestions = <T>(array: T[], count: number): T[] => {
        const shuffled = shuffleArray(array)
        return shuffled.slice(0, count)
      }

      const selectedN5 = getRandomQuestions(questionsByLevel[5], 3)
      const selectedN4 = getRandomQuestions(questionsByLevel[4], 4)
      const selectedN3 = getRandomQuestions(questionsByLevel[3], 3)

      // Kiểm tra nếu không đủ câu hỏi
      if (selectedN5.length < 3) {
        this.logger.warn(`Chỉ có ${selectedN5.length} câu N5, cần 3`)
      }
      if (selectedN4.length < 4) {
        this.logger.warn(`Chỉ có ${selectedN4.length} câu N4, cần 4`)
      }
      if (selectedN3.length < 3) {
        this.logger.warn(`Chỉ có ${selectedN3.length} câu N3, cần 3`)
      }

      // Merge và shuffle lại tất cả câu hỏi đã chọn
      const allSelected = [...selectedN5, ...selectedN4, ...selectedN3]
      const finalQuestions = shuffleArray(allSelected)

      // Map với translations và answers
      const normalizedLang = (language || '').toLowerCase().split('-')[0] || 'vi'
      const mappedQuestions = await Promise.all(
        finalQuestions.map(async (tsqb: any) => {
          const qb = tsqb.questionBank

          // Lấy translations cho question nếu có
          let questionTranslation = qb.questionJp
          if (qb.questionKey && language) {
            const languageRecord = await this.prisma.languages.findFirst({
              where: { code: language }
            })
            if (languageRecord) {
              const translation = await this.prisma.translation.findFirst({
                where: {
                  key: qb.questionKey,
                  languageId: languageRecord.id
                }
              })
              if (translation) {
                questionTranslation = translation.value
              }
            }
          }

          // Map answers với pickLabelFromComposite (giống như findFullWithAnswerByTestSetId)
          const mappedAnswers = await Promise.all(
            (qb.answers || []).map(async (ans: any) => {
              // Derive from answerJp composite string based on language
              const answerLabel = pickLabelFromComposite(
                ans?.answerJp || '',
                normalizedLang
              )
              return {
                id: ans.id,
                answer: answerLabel
              }
            })
          )

          return {
            id: tsqb.questionBankId,
            question: questionTranslation,
            questionType: qb.questionType,
            audioUrl: qb.audioUrl,
            pronunciation: qb.pronunciation,
            levelN: qb.levelN,
            answers: shuffleArray(mappedAnswers) // Shuffle answers
          }
        })
      )

      this.logger.log(
        `Selected ${finalQuestions.length} questions: ${selectedN5.length} N5, ${selectedN4.length} N4, ${selectedN3.length} N3`
      )

      return {
        statusCode: 200,
        data: {
          userTestAttemptId: userTestAttempt.id,
          questions: mappedQuestions,
          distribution: {
            level5: selectedN5.length,
            level4: selectedN4.length,
            level3: selectedN3.length,
            total: finalQuestions.length
          }
        },
        message: 'Lấy câu hỏi placement test thành công'
      }
    } catch (error) {
      this.logger.error('Error getting random questions for placement test:', error)
      if (error instanceof TestNotFoundException) {
        throw error
      }
      throw new BadRequestException('Không thể lấy câu hỏi cho placement test')
    }
  }

  async getRandomQuestionsByLevel(
    testId: number,
    levelN: number,
    count: number,
    language: string = 'vi'
  ): Promise<MessageResDTO> {
    try {
      this.logger.log(
        `Getting ${count} random questions for level ${levelN} from test: ${testId}, language: ${language}`
      )

      // Validate
      if (![1, 2, 3, 4, 5].includes(levelN)) {
        throw new BadRequestException('Level phải từ 1 đến 5')
      }
      if (count < 1) {
        throw new BadRequestException('Số lượng câu hỏi phải lớn hơn 0')
      }

      // Validate test tồn tại
      const test = await this.testRepo.findById(testId)
      if (!test) {
        throw TestNotFoundException
      }

      // Lấy các TestSets của Test
      const testTestSets = await (this.prisma as any).testTestSet.findMany({
        where: { testId },
        select: { testSetId: true }
      })

      if (testTestSets.length === 0) {
        throw new BadRequestException('Test này chưa có TestSet nào')
      }

      const testSetIds = testTestSets.map((tts: any) => tts.testSetId)

      // Lấy tất cả câu hỏi có levelN cụ thể
      const allQuestions = await this.prisma.testSetQuestionBank.findMany({
        where: {
          testSetId: { in: testSetIds },
          questionBank: {
            levelN: levelN
          }
        },
        include: {
          questionBank: {
            include: {
              answers: true
            }
          }
        }
      })

      // Shuffle và lấy số lượng cần thiết
      const shuffleArray = <T>(array: T[]): T[] => {
        const shuffled = [...array]
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1))
          ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
        }
        return shuffled
      }

      const selectedQuestions = shuffleArray(allQuestions).slice(0, count)

      // Kiểm tra nếu không đủ câu hỏi
      if (selectedQuestions.length < count) {
        this.logger.warn(
          `Chỉ có ${selectedQuestions.length} câu level ${levelN}, yêu cầu ${count}`
        )
      }

      // Map với translations và answers
      const mappedQuestions = await Promise.all(
        selectedQuestions.map(async (tsqb: any) => {
          const qb = tsqb.questionBank

          // Lấy translations cho question nếu có
          let questionTranslation = qb.questionJp
          if (qb.questionKey && language) {
            const languageRecord = await this.prisma.languages.findFirst({
              where: { code: language }
            })
            if (languageRecord) {
              const translation = await this.prisma.translation.findFirst({
                where: {
                  key: qb.questionKey,
                  languageId: languageRecord.id
                }
              })
              if (translation) {
                questionTranslation = translation.value
              }
            }
          }

          // Map answers với translations
          const mappedAnswers = await Promise.all(
            (qb.answers || []).map(async (ans: any) => {
              let answerTranslation = ans.answerJp

              if (ans.answerKey && language) {
                const languageRecord = await this.prisma.languages.findFirst({
                  where: { code: language }
                })
                if (languageRecord) {
                  const translation = await this.prisma.translation.findFirst({
                    where: {
                      key: ans.answerKey,
                      languageId: languageRecord.id
                    }
                  })
                  if (translation) {
                    answerTranslation = translation.value
                  }
                }
              }

              return {
                id: ans.id,
                answer: answerTranslation,
                isCorrect: ans.isCorrect
              }
            })
          )

          return {
            id: qb.id,
            question: questionTranslation,
            questionType: qb.questionType,
            audioUrl: qb.audioUrl,
            pronunciation: qb.pronunciation,
            levelN: qb.levelN,
            answers: shuffleArray(mappedAnswers), // Shuffle answers
            isCorrect: undefined // Ẩn đáp án đúng khi trả về
          }
        })
      )

      this.logger.log(`Selected ${mappedQuestions.length} questions for level ${levelN}`)

      return {
        statusCode: 200,
        data: {
          questions: mappedQuestions,
          levelN,
          count: mappedQuestions.length
        },
        message: `Lấy ${mappedQuestions.length} câu hỏi level N${levelN} thành công`
      }
    } catch (error) {
      this.logger.error('Error getting random questions by level:', error)
      if (error instanceof TestNotFoundException) {
        throw error
      }
      throw new BadRequestException('Không thể lấy câu hỏi')
    }
  }

  async generateLessonReviewTest(
    testId: number,
    userId: number,
    language: string = 'vi'
  ): Promise<MessageResDTO> {
    try {
      this.logger.log(
        `Generating lesson review test for testId: ${testId}, user: ${userId}, language: ${language}`
      )

      // Lấy thông tin Test cơ bản (giống findFullById)
      const test = await this.testRepo.findById(testId, language)
      if (!test) {
        throw TestNotFoundException
      }

      // Kiểm tra UserTest tồn tại, nếu không thì tạo
      let userTest = await this.userTestRepo.findByUserAndTest(userId, testId)
      if (!userTest) {
        await this.userTestService.create({
          userId,
          testId: testId,
          status: UserTestStatus.ACTIVE
        })
      }

      // Tạo UserTestAttempt mới
      const userTestAttempt = await this.userTestAttemptRepo.create({
        userId,
        testId: testId
      })

      // Lấy các TestSets của Test qua TestTestSet (giống findFullById)
      const testTestSets =
        await this.testRepo.findTestTestSetsWithTestSetAndCreator(testId)

      // Lọc 3 testSet: VOCABULARY, GRAMMAR, KANJI
      const targetTypes = ['VOCABULARY', 'GRAMMAR', 'KANJI']
      const testSetsByType: Record<string, any> = {}

      for (const testTestSet of testTestSets) {
        const testSet = testTestSet.testSet
        if (testSet && testSet.testType && targetTypes.includes(testSet.testType)) {
          const type = testSet.testType
          if (!testSetsByType[type]) {
            testSetsByType[type] = testTestSet
          }
        }
      }

      // Kiểm tra có đủ 3 testSet không
      const missingTypes = targetTypes.filter((type) => !testSetsByType[type])
      if (missingTypes.length > 0) {
        throw new BadRequestException(
          `Test này thiếu testSet loại: ${missingTypes.join(', ')}`
        )
      }

      // Lấy tất cả questions từ 3 testSet để filter và random
      // Lưu testSetId và testSetType vào mỗi question để có thể phân loại lại sau
      const allQuestionsWithTestSetInfo: Array<{
        question: any
        testSetId: number
        testSetType: string
      }> = []

      for (const type of targetTypes) {
        const testTestSet = testSetsByType[type]
        const testSet = testTestSet.testSet

        // Lấy questions + answers cho TestSet (giống findFullById)
        const questionsResult =
          await this.testSetQuestionBankService.findFullWithAnswerByTestSetId(
            testSet.id,
            language
          )
        const questions = questionsResult.data || []

        // Lọc chỉ lấy câu hỏi đúng loại (nếu cần)
        const filteredQuestions = questions.filter(
          (q: any) => q.questionBank?.questionType === type
        )

        // Shuffle và lấy 5 câu đầu từ mỗi testSet
        const shuffled = this.shuffleArray(filteredQuestions)
        const selected = shuffled.slice(0, 5)

        if (selected.length < 5) {
          this.logger.warn(`TestSet ${type} chỉ có ${selected.length} câu, cần 5 câu`)
        }

        // Thêm testSetId và testSetType vào mỗi question
        for (const question of selected) {
          allQuestionsWithTestSetInfo.push({
            question,
            testSetId: testSet.id,
            testSetType: type
          })
        }
      }

      if (allQuestionsWithTestSetInfo.length < 10) {
        throw new BadRequestException(
          `Không đủ câu hỏi. Tổng có ${allQuestionsWithTestSetInfo.length} câu, cần ít nhất 10 câu`
        )
      }

      // Random chọn 10 câu từ 15 câu
      const shuffledAll = this.shuffleArray(allQuestionsWithTestSetInfo)
      const finalQuestionsWithInfo = shuffledAll.slice(0, 10)

      // Phân loại 10 câu đã chọn theo testSet
      const finalQuestionsByTestSet: Record<string, any[]> = {}
      for (const type of targetTypes) {
        finalQuestionsByTestSet[type] = []
      }

      for (const { question, testSetType } of finalQuestionsWithInfo) {
        if (finalQuestionsByTestSet[testSetType]) {
          finalQuestionsByTestSet[testSetType].push(question)
        }
      }

      // Tạo testSets với details (giống findFullById)
      const testSetsWithDetails = await Promise.all(
        targetTypes.map(async (type) => {
          const testTestSet = testSetsByType[type]
          const testSet = testTestSet.testSet

          // Lấy translations cho TestSet (giống findFullById)
          const testSetNameKey = `testset.${testSet.id}.name`
          const testSetDescriptionKey = `testset.${testSet.id}.description`
          const testSetContentKey = `testset.${testSet.id}.content`

          const testSetTranslationWhere: any = {
            OR: [
              { key: testSetNameKey },
              { key: testSetDescriptionKey },
              { key: testSetContentKey },
              { key: { startsWith: testSetNameKey + '.meaning.' } },
              { key: { startsWith: testSetDescriptionKey + '.meaning.' } },
              { key: { startsWith: testSetContentKey + '.meaning.' } }
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
            include: { language: true }
          })

          let testSetName: any = testSet.name
          let testSetDescription: any = testSet.description
          let testSetContent: any = testSet.content

          if (language) {
            const nameTranslation = testSetTranslations.find((t) =>
              t.key.startsWith(testSetNameKey + '.meaning.')
            )
            const descriptionTranslation = testSetTranslations.find((t) =>
              t.key.startsWith(testSetDescriptionKey + '.meaning.')
            )
            const contentTranslation = testSetTranslations.find((t) =>
              t.key.startsWith(testSetContentKey + '.meaning.')
            )

            testSetName = nameTranslation?.value || testSet.name
            testSetDescription = descriptionTranslation?.value || testSet.description
            testSetContent = contentTranslation?.value || testSet.content
          } else {
            const nameTranslations = testSetTranslations.filter((t) =>
              t.key.startsWith(testSetNameKey + '.meaning.')
            )
            const descriptionTranslations = testSetTranslations.filter((t) =>
              t.key.startsWith(testSetDescriptionKey + '.meaning.')
            )
            const contentTranslations = testSetTranslations.filter((t) =>
              t.key.startsWith(testSetContentKey + '.meaning.')
            )

            testSetName = nameTranslations.map((t) => ({
              language: t.language.code,
              value: t.value
            }))
            testSetDescription = descriptionTranslations.map((t) => ({
              language: t.language.code,
              value: t.value
            }))
            testSetContent = contentTranslations.map((t) => ({
              language: t.language.code,
              value: t.value
            }))
          }

          // Chỉ lấy questions đã được chọn từ testSet này
          const selectedQuestions = finalQuestionsByTestSet[type] || []

          // Map questions để loại bỏ các fields không cần thiết
          const mappedQuestions = selectedQuestions.map((q: any) => {
            const { questionBank } = q
            return {
              id: q.id,
              questionOrder: q.questionOrder,
              questionBank: {
                id: questionBank.id,
                question: questionBank.question,
                answers: questionBank.answers
              }
            }
          })

          return {
            questions: mappedQuestions
          }
        })
      )

      // Format response - chỉ giữ lại userTestAttemptId
      const result = {
        testSets: testSetsWithDetails,
        userTestAttemptId: userTestAttempt.id
      }

      this.logger.log(
        `Generated lesson review test with ${finalQuestionsWithInfo.length} questions for testId ${testId}`
      )

      return {
        statusCode: 200,
        data: result,
        message: TEST_MESSAGE.GET_SUCCESS
      }
    } catch (error) {
      this.logger.error('Error generating lesson review test:', error)
      if (
        error instanceof BadRequestException ||
        error instanceof TestNotFoundException
      ) {
        throw error
      }
      throw new BadRequestException('Không thể lấy câu hỏi bài test ôn tập')
    }
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }
}
