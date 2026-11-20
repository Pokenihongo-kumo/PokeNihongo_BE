import { TestMessage as M } from '@/i18n/message-keys'
import { toPaginationMeta } from '@/shared/utils/pagination'
import { isNotFoundPrismaError } from '@/shared/utils/prisma-errors'
import { HttpException, Injectable, Logger } from '@nestjs/common'
import { TestStatus, UserTestStatus } from '@prisma/client'
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
import { TestQuestionPicker } from './test-question-picker.service'
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
    private readonly userTestService: UserTestService,
    private readonly picker: TestQuestionPicker
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

  // ---- moved to TestQuestionPicker (phase 6 X4); the controller still calls these ----

  findFullById(...args: Parameters<TestQuestionPicker['findFullById']>) {
    return this.picker.findFullById(...args)
  }

  findFullByIdForUser(...args: Parameters<TestQuestionPicker['findFullByIdForUser']>) {
    return this.picker.findFullByIdForUser(...args)
  }

  getRandomQuestionsForPlacementTest(
    ...args: Parameters<TestQuestionPicker['getRandomQuestionsForPlacementTest']>
  ) {
    return this.picker.getRandomQuestionsForPlacementTest(...args)
  }

  getRandomQuestionsByLevel(
    ...args: Parameters<TestQuestionPicker['getRandomQuestionsByLevel']>
  ) {
    return this.picker.getRandomQuestionsByLevel(...args)
  }

  generateLessonReviewTest(
    ...args: Parameters<TestQuestionPicker['generateLessonReviewTest']>
  ) {
    return this.picker.generateLessonReviewTest(...args)
  }

  // ---- For other modules (user-test-attempt) ----

  findWithTestSetsAndQuestions(
    ...args: Parameters<TestRepo['findByIdWithTestSetsAndQuestions']>
  ) {
    return this.testRepo.findByIdWithTestSetsAndQuestions(...args)
  }
}
