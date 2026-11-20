import { pickLabelFromComposite } from '@/common/utils/prase.utils'
import { TestMessage as M } from '@/i18n/message-keys'
import { isNotFoundPrismaError } from '@/shared/utils/prisma-errors'
import { HttpException, Injectable, Logger } from '@nestjs/common'
import { UserTestStatus } from '@prisma/client'
import { TestSetQuestionBankService } from '../testset-questionbank/testset-questionbank.service'
import { UserTestAttemptRepo } from '../user-test-attempt/user-test-attempt.repo'
import { UserTestRepo } from '../user-test/user-test.repo'
import { UserTestService } from '../user-test/user-test.service'
import {
  InvalidTestDataException,
  TestNotFoundException,
  TestPermissionDeniedException,
  TestRuleViolationException
} from './dto/test.error'
import { Test } from './entities/test.entity'
import { TestRepo } from './test.repo'

// A test of one of these types only takes test sets of the matching type

// Building tests to take: the full test (admin and user views), random
// placement questions, random questions by level and the generated
// lesson-review test. TestService keeps the test CRUD and forwards here.
@Injectable()
export class TestQuestionPicker {
  private readonly logger = new Logger(TestQuestionPicker.name)

  constructor(
    private readonly testRepo: TestRepo,
    private readonly testSetQuestionBankService: TestSetQuestionBankService,
    private readonly userTestAttemptRepo: UserTestAttemptRepo,
    private readonly userTestRepo: UserTestRepo,
    private readonly userTestService: UserTestService
  ) {}

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

  // HttpExceptions pass through (they used to be swallowed into a generic 400);
  // anything else is logged and becomes `fallback`
  private toTestError(error: unknown, fallback: string = M.INVALID_DATA): HttpException {
    if (error instanceof HttpException) return error
    this.logger.error('Test request failed', error instanceof Error ? error.stack : error)
    if (isNotFoundPrismaError(error)) return new TestNotFoundException()
    return new InvalidTestDataException(fallback)
  }
}
