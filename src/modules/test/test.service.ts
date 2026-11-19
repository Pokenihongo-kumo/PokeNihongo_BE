import { pickLabelFromComposite } from '@/common/utils/prase.utils'
import { TestMessage as M } from '@/i18n/message-keys'
import { MessageResDTO } from '@/shared/dtos/response.dto'
import { toPaginationMeta } from '@/shared/utils/pagination'
import { isNotFoundPrismaError } from '@/shared/utils/prisma-errors'
import { HttpException, Injectable, Logger } from '@nestjs/common'
import { TestStatus, UserTestStatus } from '@prisma/client'
import { TestSetQuestionBankService } from '../testset-questionbank/testset-questionbank.service'
import { UserTestAttemptRepo } from '../user-test-attempt/user-test-attempt.repo'
import { UserTestRepo } from '../user-test/user-test.repo'
import { UserTestService } from '../user-test/user-test.service'
import {
  InvalidTestDataException,
  TestNotFoundException,
  TestPermissionDeniedException,
  TestReferenceNotFoundException,
  TestRuleViolationException
} from './dto/test.error'
import {
  AddTestSetsToTestBody,
  CreateTestWithMeaningsBody,
  DeleteManyTestsBody,
  GetTestListQuery,
  RemoveTestSetsFromTestBody,
  UpdateTestWithMeaningsBody
} from './dto/test.zod-dto'
import { Test } from './entities/test.entity'
import { TestRepo } from './test.repo'

// A test of one of these types only takes test sets of the matching type
const SINGLE_TYPE_TESTS = ['READING_TEST', 'LISTENING_TEST', 'SPEAKING_TEST']
const testSetTypeOf = (testType: string) => testType.replace('_TEST', '') // READING_TEST -> READING
const LESSON_REVIEW_TYPES = ['VOCABULARY', 'GRAMMAR', 'KANJI']

@Injectable()
export class TestService {
  private readonly logger = new Logger(TestService.name)

  constructor(
    private readonly testRepo: TestRepo,
    private readonly testSetQuestionBankService: TestSetQuestionBankService,
    private readonly userTestAttemptRepo: UserTestAttemptRepo,
    private readonly userTestRepo: UserTestRepo,
    private readonly userTestService: UserTestService
  ) {}

  // Admins get every translation of name/description (lang undefined)
  async findAll(query: GetTestListQuery, lang?: string) {
    const { data, total } = await this.testRepo.findMany({ ...query, language: lang })
    return {
      results: data,
      pagination: toPaginationMeta(query.currentPage, query.pageSize, total)
    }
  }

  // Also used by user-test-attempt (reads data)
  async findOne(id: number, lang: string = 'vi') {
    const test = await this.testRepo.findById(id, lang)
    if (!test) throw new TestNotFoundException()
    return test
  }

  // There is only one PLACEMENT_TEST_DONE test; every user then gets a UserTest
  async createTestWithMeanings(data: CreateTestWithMeaningsBody, userId: number) {
    try {
      if (data.testType === TestStatus.PLACEMENT_TEST_DONE) {
        const existing = await this.testRepo.findPlacementDoneTestId()
        if (existing) throw new TestRuleViolationException(M.PLACEMENT_EXISTS)
      }
      const test = await this.testRepo.createWithMeanings(data, userId)
      await this.initUserTests()
      return test
    } catch (error) {
      throw this.toTestError(error, M.CANNOT_CREATE)
    }
  }

  // Only the creator; a type change must fit the test sets already there.
  // A status change updates the users' UserTests, then all users are re-synced
  async updateTestWithMeanings(
    id: number,
    data: UpdateTestWithMeaningsBody,
    userId: number
  ) {
    try {
      const test = await this.ownedTest(id, userId)
      if (data.testType && data.testType !== test.testType) {
        await this.assertTestSetsFitType(id, data.testType)
      }
      const updated = await this.testRepo.updateWithMeanings(id, data)
      if (data.status && data.status !== test.status) {
        await this.syncUserTestStatus(id, data.status, {
          testType: data.testType ?? test.testType,
          price: data.price !== undefined ? data.price : test.price
        })
      }
      await this.initUserTests()
      return updated
    } catch (error) {
      throw this.toTestError(error)
    }
  }

  // Only the creator; returns the deleted test
  async deleteTest(id: number, userId: number) {
    try {
      const test = await this.ownedTest(id, userId)
      await this.testRepo.delete(id)
      return test
    } catch (error) {
      throw this.toTestError(error)
    }
  }

  // Every id must exist and belong to the user (up to 100)
  async deleteManyTests(data: DeleteManyTestsBody, userId: number) {
    try {
      const { ids } = data
      const tests = await this.testRepo.findCreatorsOf(ids)
      const found = new Set(tests.map((t) => t.id))
      const missing = ids.filter((id) => !found.has(id))
      if (missing.length > 0) {
        throw new TestReferenceNotFoundException(M.TESTS_NOT_FOUND, {
          ids: missing.join(', ')
        })
      }
      if (tests.some((t) => t.creatorId !== userId))
        throw new TestPermissionDeniedException()

      const result = await this.testRepo.deleteMany(ids)
      if (result.deletedCount === 0)
        throw new TestRuleViolationException(M.CANNOT_DELETE_MANY)
      return {
        deletedCount: result.deletedCount,
        deletedIds: result.deletedIds,
        requestedCount: ids.length,
        notFoundCount: ids.length - result.deletedCount
      }
    } catch (error) {
      throw this.toTestError(error, M.CANNOT_DELETE_MANY)
    }
  }

  // Test sets that belonged to another test move to this one.
  // LESSON_REVIEW: one each of VOCABULARY/GRAMMAR/KANJI (3 at most).
  // READING/LISTENING/SPEAKING_TEST: only that type; SPEAKING_TEST: one at most
  async addTestSetsToTest(testId: number, data: AddTestSetsToTestBody) {
    try {
      const test = await this.testRepo.findById(testId)
      if (!test) throw new TestNotFoundException()

      const testSets = await this.testRepo.findTestSetsByIds(data.testSetIds)
      if (testSets.length !== data.testSetIds.length) {
        const found = new Set(testSets.map((ts) => ts.id))
        throw new TestReferenceNotFoundException(M.TESTSETS_NOT_FOUND, {
          ids: data.testSetIds.filter((id) => !found.has(id)).join(', ')
        })
      }

      if (test.testType === TestStatus.LESSON_REVIEW) {
        await this.assertLessonReviewFits(testId, testSets, data.testSetIds)
      }
      if (SINGLE_TYPE_TESTS.includes(test.testType)) {
        await this.assertSingleTypeFits(testId, test.testType, testSets)
      }

      // Move the test sets out of the tests they belonged to
      await this.testRepo.unlinkTestSetsFromOtherTests(data.testSetIds, testId)
      await this.testRepo.linkTestSets(testId, data.testSetIds)
      return { testId, addedTestSetIds: data.testSetIds, count: data.testSetIds.length }
    } catch (error) {
      throw this.toTestError(error, M.CANNOT_ADD_TESTSETS)
    }
  }

  // The lesson's review test ends up with exactly these test sets
  async addTestSetsToLessonReviewTest(lessonId: number, data: AddTestSetsToTestBody) {
    try {
      const lesson = await this.testRepo.findLessonTestId(lessonId)
      if (!lesson) throw new TestNotFoundException(M.LESSON_NOT_FOUND, { id: lessonId })
      if (!lesson.testId) {
        throw new TestRuleViolationException(M.LESSON_HAS_NO_TEST, { id: lessonId })
      }

      const existing = await this.testRepo.findTestSetIdsOfTest(lesson.testId)
      const toRemove = existing
        .map((tts) => tts.testSetId)
        .filter((id) => !data.testSetIds.includes(id))
      if (toRemove.length > 0) {
        await this.removeTestSetsFromTest(lesson.testId, { testSetIds: toRemove })
      }
      return await this.addTestSetsToTest(lesson.testId, data)
    } catch (error) {
      throw this.toTestError(error, M.CANNOT_ADD_TESTSETS)
    }
  }

  async removeTestSetsFromTest(testId: number, data: RemoveTestSetsFromTestBody) {
    try {
      if (!(await this.testRepo.findById(testId))) throw new TestNotFoundException()
      const where = { testId, testSetId: { in: data.testSetIds } }
      const { count } = await this.testRepo.deleteTestSetLinks(where)
      if (count === 0) throw new TestRuleViolationException(M.NO_TESTSET_TO_REMOVE)
      return { testId, removedTestSetIds: data.testSetIds, count }
    } catch (error) {
      throw this.toTestError(error, M.CANNOT_REMOVE_TESTSETS)
    }
  }

  //#region rules and helpers
  private async ownedTest(id: number, userId: number): Promise<Test> {
    const test = await this.testRepo.findById(id)
    if (!test) throw new TestNotFoundException()
    if (test.creatorId !== userId) throw new TestPermissionDeniedException()
    return test
  }

  // Changing to READING/LISTENING/SPEAKING_TEST: every test set must be of that type
  private async assertTestSetsFitType(testId: number, testType: string) {
    if (!SINGLE_TYPE_TESTS.includes(testType)) return
    const links = await this.testRepo.findTestSetTypesOfTest(testId)
    const invalid = links.filter((l) => l.testSet.testType !== testSetTypeOf(testType))
    if (invalid.length > 0) {
      throw new TestRuleViolationException(M.TYPE_CHANGE_INVALID_TESTSETS, {
        testType,
        ids: invalid.map((l) => l.testSet.id).join(', ')
      })
    }
  }

  private async assertLessonReviewFits(
    testId: number,
    testSets: { id: number; testType: string }[],
    testSetIds: number[]
  ) {
    const invalid = testSets.filter((ts) => !LESSON_REVIEW_TYPES.includes(ts.testType))
    if (invalid.length > 0) {
      throw new TestRuleViolationException(M.LESSON_REVIEW_INVALID_TYPES, {
        ids: invalid.map((ts) => ts.id).join(', '),
        types: invalid.map((ts) => ts.testType).join(', ')
      })
    }
    const existing = await this.testRepo.findTestSetIdsAndTypes(testId)
    const existingIds = existing.map((e) => e.testSetId)
    const added = testSets.filter(
      (ts) => testSetIds.includes(ts.id) && !existingIds.includes(ts.id)
    )
    const repeated = (types: string[]) =>
      [...new Set(types.filter((t, i) => types.indexOf(t) !== i))].join(', ')

    const repeatedNew = repeated(added.map((ts) => ts.testType))
    if (repeatedNew) {
      throw new TestRuleViolationException(M.DUPLICATE_NEW_TYPES, { types: repeatedNew })
    }
    const repeatedAll = repeated([
      ...existing.map((e) => e.testSet.testType),
      ...added.map((ts) => ts.testType)
    ])
    if (repeatedAll) {
      throw new TestRuleViolationException(M.LESSON_REVIEW_DUPLICATE_TYPES, {
        types: repeatedAll
      })
    }
    const total = existing.length + added.length
    if (total > LESSON_REVIEW_TYPES.length) {
      throw new TestRuleViolationException(M.LESSON_REVIEW_TOO_MANY, {
        existing: existing.length,
        adding: added.length,
        total
      })
    }
  }

  private async assertSingleTypeFits(
    testId: number,
    testType: string,
    testSets: { id: number; testType: string }[]
  ) {
    const allowed = testSetTypeOf(testType)
    const invalid = testSets.filter((ts) => ts.testType !== allowed)
    if (invalid.length > 0) {
      throw new TestRuleViolationException(M.TESTSET_TYPE_NOT_ALLOWED, {
        testType,
        allowed,
        ids: invalid.map((ts) => ts.id).join(', ')
      })
    }
    if (testType === 'SPEAKING_TEST') {
      const existing = await this.testRepo.countSpeakingTestSets(testId)
      const adding = testSets.filter((ts) => ts.testType === 'SPEAKING').length
      if (existing + adding > 1) {
        throw new TestRuleViolationException(M.SPEAKING_TOO_MANY, { existing, adding })
      }
    }
  }

  // INACTIVE: the users' UserTests go back to NOT_STARTED. ACTIVE: ACTIVE, or
  // NOT_STARTED for a paid or subscription test. Failures are only logged
  private async syncUserTestStatus(
    testId: number,
    status: string,
    test: { testType: TestStatus | string; price?: number | null }
  ) {
    try {
      if (status === 'INACTIVE') {
        await this.userTestService.updateStatusByTestId(
          testId,
          UserTestStatus.NOT_STARTED
        )
      } else if (status === 'ACTIVE') {
        const paid = Number(test.price ?? 0) > 0
        await this.userTestService.updateStatusByTestId(
          testId,
          test.testType === TestStatus.SUBSCRIPTION_TEST || paid
            ? UserTestStatus.NOT_STARTED
            : UserTestStatus.ACTIVE
        )
      }
    } catch (error) {
      this.logger.error('Syncing user tests after a status change failed', error)
    }
  }

  // Every user gets the active tests (status, limits); failures are only logged
  private async initUserTests() {
    try {
      await this.userTestService.initAllUsersTests()
    } catch (error) {
      this.logger.error('Initializing user tests failed', error)
    }
  }

  // HttpExceptions pass through (they used to be swallowed into a generic 400);
  // anything else is logged and becomes `fallback`
  private toTestError(error: unknown, fallback: string = M.INVALID_DATA): HttpException {
    if (error instanceof HttpException) return error
    this.logger.error('Test request failed', error instanceof Error ? error.stack : error)
    if (isNotFoundPrismaError(error)) return new TestNotFoundException()
    return new InvalidTestDataException(fallback)
  }
  //#endregion

  async findFullById(testId: number, language: string = 'vi') {
    try {
      this.logger.log(`Finding full test by ID: ${testId}, language: ${language}`)

      // Lấy thông tin Test cơ bản
      const test = await this.testRepo.findById(testId, language)
      if (!test) {
        throw new TestNotFoundException()
      }

      // Lấy các TestSets của Test qua TestTestSet
      const testTestSets = await this.testRepo.findTestSetsWithCreator(testId)

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
            const languageRecord = await this.testRepo.findLanguageByCode(language)
            if (languageRecord) {
              testSetTranslationWhere.languageId = languageRecord.id
            }
          }

          const testSetTranslations = await this.testRepo.findTranslations(
            testSetTranslationWhere
          )

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
          const questions = questionsResult || []

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

      return result
    } catch (error) {
      throw this.toTestError(error, M.CANNOT_GET)
    }
  }

  async findFullByIdForUser(testId: number, language: string = 'vi') {
    try {
      this.logger.log(
        `Finding full test by ID for user: ${testId}, language: ${language}`
      )

      // Lấy thông tin Test cơ bản
      const test = await this.testRepo.findById(testId, language)
      if (!test) {
        throw new TestNotFoundException()
      }

      // Lấy các TestSets của Test qua TestTestSet (không include creator cho user)
      const testTestSets = await this.testRepo.findTestSetsOfTest(testId)

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
            const languageRecord = await this.testRepo.findLanguageByCode(language)
            if (languageRecord) {
              testSetTranslationWhere.languageId = languageRecord.id
            }
          }

          const testSetTranslations = await this.testRepo.findTranslations(
            testSetTranslationWhere
          )

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
          const questions = questionsResult || []

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

      return result
    } catch (error) {
      throw this.toTestError(error, M.CANNOT_GET)
    }
  }

  // outcome tells the controller which message fits (0 added can mean either case)
  async autoAddFreeTestSets(): Promise<{
    outcome: 'no-placement' | 'no-free-testsets' | 'added'
    data: { totalTests: number; totalTestSetsAdded: number }
  }> {
    try {
      this.logger.log('Starting auto-add free testSets to PLACEMENT_TEST_DONE tests')

      // Tìm tất cả Test có type PLACEMENT_TEST_DONE
      const placementTests = await this.testRepo.findActivePlacementDoneTestIds()

      if (placementTests.length === 0) {
        this.logger.warn('No PLACEMENT_TEST_DONE tests found')
        return { outcome: 'no-placement', data: { totalTests: 0, totalTestSetsAdded: 0 } }
      }

      // Tìm tất cả TestSet có price = 0, status = ACTIVE, và testType là VOCABULARY, GRAMMAR, hoặc KANJI
      const freeTestSets = await this.testRepo.findFreeActiveLearningTestSetIds()

      if (freeTestSets.length === 0) {
        this.logger.warn('No free testSets found')
        return {
          outcome: 'no-free-testsets',
          data: { totalTests: placementTests.length, totalTestSetsAdded: 0 }
        }
      }

      let totalAdded = 0

      // Thêm các TestSet free vào từng Test PLACEMENT_TEST_DONE
      for (const test of placementTests) {
        const testSetIds = freeTestSets.map((ts) => ts.id)

        // Lấy danh sách TestSet đã có trong Test này
        const existingTestTestSets = await this.testRepo.findTestSetIdsOfTest(test.id)

        const existingTestSetIds = existingTestTestSets.map((tts: any) => tts.testSetId)
        const newTestSetIds = testSetIds.filter((id) => !existingTestSetIds.includes(id))

        if (newTestSetIds.length > 0) {
          await this.testRepo.addTestSets(test.id, newTestSetIds)

          totalAdded += newTestSetIds.length
          this.logger.log(`Added ${newTestSetIds.length} testSets to Test ID ${test.id}`)
        }
      }

      this.logger.log(
        `Successfully added ${totalAdded} testSets to ${placementTests.length} tests`
      )

      return {
        outcome: 'added',
        data: { totalTests: placementTests.length, totalTestSetsAdded: totalAdded }
      }
    } catch (error) {
      throw this.toTestError(error, M.CANNOT_AUTO_ADD)
    }
  }

  async getRandomQuestionsForPlacementTest(
    testId: number,
    userId: number,
    language: string = 'vi'
  ) {
    try {
      this.logger.log(
        `Getting random questions for placement test: ${testId}, user: ${userId}, language: ${language}`
      )

      // Validate test tồn tại và là PLACEMENT_TEST_DONE
      const test = await this.testRepo.findById(testId)
      if (!test) {
        throw new TestNotFoundException()
      }

      if (test.testType !== 'PLACEMENT_TEST_DONE') {
        throw new TestRuleViolationException(M.NOT_PLACEMENT_TEST)
      }

      // Kiểm tra UserTest tồn tại và limit
      const userTest = await this.userTestRepo.findByUserAndTest(userId, testId)
      if (!userTest) {
        throw new TestPermissionDeniedException(M.NO_ACCESS)
      }

      // Lấy attempt được tạo gần nhất của userId và testId (không phân biệt status)
      const latestAttempt = await this.userTestAttemptRepo.findLatestOfUserForTest(
        userId,
        testId
      )

      let userTestAttempt

      // Nếu có attempt gần nhất và là IN_PROGRESS → dùng lại (xử lý trường hợp rớt mạng)
      if (latestAttempt && latestAttempt.status === 'IN_PROGRESS') {
        // Sử dụng attempt đó (không tạo mới, không giảm limit)
        // Xóa tất cả UserTestAnswerLog của attempt này để bắt đầu lại từ đầu
        this.logger.log(
          `Found existing IN_PROGRESS UserTestAttempt with ID: ${latestAttempt.id} for user ${userId} and test ${testId}`
        )

        const deletedLogsCount = await this.userTestAttemptRepo.clearAnswerLogs(
          latestAttempt.id
        )
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
      const testTestSets = await this.testRepo.findTestSetIdsOfTest(testId)

      if (testTestSets.length === 0) {
        throw new TestRuleViolationException(M.NO_TESTSETS)
      }

      const testSetIds = testTestSets.map((tts: any) => tts.testSetId)

      // Lấy tất cả câu hỏi từ các TestSets, nhóm theo levelN
      const allQuestions = await this.testRepo.findQuestionsOfTestSets(testSetIds)

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
            const languageRecord = await this.testRepo.findLanguageByCode(language)
            if (languageRecord) {
              const translation = await this.testRepo.findTranslationByKey(
                qb.questionKey,
                languageRecord.id
              )
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
        userTestAttemptId: userTestAttempt.id,
        questions: mappedQuestions,
        distribution: {
          level5: selectedN5.length,
          level4: selectedN4.length,
          level3: selectedN3.length,
          total: finalQuestions.length
        }
      }
    } catch (error) {
      throw this.toTestError(error, M.CANNOT_GET_PLACEMENT_QUESTIONS)
    }
  }

  async getRandomQuestionsByLevel(
    testId: number,
    levelN: number,
    count: number,
    language: string = 'vi'
  ) {
    try {
      this.logger.log(
        `Getting ${count} random questions for level ${levelN} from test: ${testId}, language: ${language}`
      )

      // Validate
      if (![1, 2, 3, 4, 5].includes(levelN)) {
        throw new TestRuleViolationException(M.INVALID_LEVEL_N)
      }
      if (count < 1) {
        throw new TestRuleViolationException(M.INVALID_COUNT)
      }

      // Validate test tồn tại
      const test = await this.testRepo.findById(testId)
      if (!test) {
        throw new TestNotFoundException()
      }

      // Lấy các TestSets của Test
      const testTestSets = await this.testRepo.findTestSetIdsOfTest(testId)

      if (testTestSets.length === 0) {
        throw new TestRuleViolationException(M.NO_TESTSETS)
      }

      const testSetIds = testTestSets.map((tts: any) => tts.testSetId)

      // Lấy tất cả câu hỏi có levelN cụ thể
      const allQuestions = await this.testRepo.findQuestionsOfTestSetsAtLevel(
        testSetIds,
        levelN
      )

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
            const languageRecord = await this.testRepo.findLanguageByCode(language)
            if (languageRecord) {
              const translation = await this.testRepo.findTranslationByKey(
                qb.questionKey,
                languageRecord.id
              )
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
                const languageRecord = await this.testRepo.findLanguageByCode(language)
                if (languageRecord) {
                  const translation = await this.testRepo.findTranslationByKey(
                    ans.answerKey,
                    languageRecord.id
                  )
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

      return { questions: mappedQuestions, levelN, count: mappedQuestions.length }
    } catch (error) {
      throw this.toTestError(error, M.CANNOT_GET_QUESTIONS)
    }
  }

  async generateLessonReviewTest(
    testId: number,
    userId: number,
    language: string = 'vi'
  ) {
    try {
      this.logger.log(
        `Generating lesson review test for testId: ${testId}, user: ${userId}, language: ${language}`
      )

      // Lấy thông tin Test cơ bản (giống findFullById)
      const test = await this.testRepo.findById(testId, language)
      if (!test) {
        throw new TestNotFoundException()
      }

      // Kiểm tra UserTest tồn tại, nếu không thì tạo
      const userTest = await this.userTestRepo.findByUserAndTest(userId, testId)
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
        throw new TestRuleViolationException(M.MISSING_TESTSET_TYPES, {
          types: missingTypes.join(', ')
        })
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
        const questions = questionsResult || []

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
        throw new TestRuleViolationException(M.NOT_ENOUGH_QUESTIONS, {
          count: allQuestionsWithTestSetInfo.length
        })
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
            const languageRecord = await this.testRepo.findLanguageByCode(language)
            if (languageRecord) {
              testSetTranslationWhere.languageId = languageRecord.id
            }
          }

          const testSetTranslations = await this.testRepo.findTranslations(
            testSetTranslationWhere
          )

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

      return result
    } catch (error) {
      throw this.toTestError(error, M.CANNOT_GET_REVIEW_QUESTIONS)
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
