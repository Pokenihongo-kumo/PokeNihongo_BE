import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '@/shared/services/prisma.service'
import {
  GetHistoryListQueryType,
  GetAdminHistoryListQueryType,
  GetRecentExercisesQueryType,
  HistoryTestsResType
} from './entities/user-history.entities'
import { MessageResDTO } from '@/shared/dtos/response.dto'
import { TestAttemptStatus, ExerciseAttemptStatus } from '@prisma/client'
import { I18nService } from '@/i18n/i18n.service'
import { UserHistoryMessage } from '@/i18n/message-keys'
import { TranslationService } from '@/modules/translation/translation.service'
import { LanguagesService } from '@/modules/languages/languages.service'
import { UserHistoryRepository } from './user-history.repo'

@Injectable()
export class UserHistoryService {
  private readonly logger = new Logger(UserHistoryService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly userHistoryRepository: UserHistoryRepository,
    private readonly i18nService: I18nService,
    private readonly translationService: TranslationService,
    private readonly languagesService: LanguagesService
  ) {}

  async findHistory(
    userId: number,
    query: GetHistoryListQueryType,
    language?: string
  ): Promise<MessageResDTO> {
    try {
      this.logger.log(`Finding history for user ${userId}, type: ${query.type || 'ALL'}`)

      const { currentPage = 1, pageSize = 10, type, status } = query
      const skip = (currentPage - 1) * pageSize
      const normalizedLang = (language || '').toLowerCase().split('-')[0] || 'vi'

      // Lấy userTestAttempts nếu type là TEST hoặc không filter
      const testAttempts =
        type === 'TEST' || !type
          ? await this.prisma.userTestAttempt.findMany({
              where: {
                userId,
                ...(status ? { status: status as TestAttemptStatus } : {})
              },
              include: {
                test: true
              },
              orderBy: {
                createdAt: 'desc'
              }
            })
          : []

      // Lấy userExerciseAttempts nếu type là EXERCISE hoặc không filter
      const exerciseAttempts =
        type === 'EXERCISE' || !type
          ? await this.prisma.userExerciseAttempt.findMany({
              where: {
                userId,
                ...(status ? { status: status as ExerciseAttemptStatus } : {})
              },
              include: {
                exercise: {
                  include: {
                    testSet: true
                  }
                }
              },
              orderBy: {
                createdAt: 'desc'
              }
            })
          : []

      // Map test attempts
      const testHistoryItems = await Promise.all(
        testAttempts.map(async (attempt: any) => {
          // Lấy answer logs để tính correct/incorrect
          const answerLogs = await this.prisma.userTestAnswerLog.findMany({
            where: {
              userTestAttemptId: attempt.id
            }
          })

          const correctAnswers = answerLogs.filter((log) => log.isCorrect).length
          const incorrectAnswers = answerLogs.filter((log) => !log.isCorrect).length
          const totalQuestions = answerLogs.length

          // Lấy tên test với i18n
          let testName = attempt.test.name || ''
          if (language) {
            // Lấy translation cho test name
            const nameKey = `test.${attempt.test.id}.name`
            const translationWhere: any = {
              OR: [{ key: nameKey }, { key: { startsWith: nameKey + '.meaning.' } }]
            }

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
              include: { language: true },
              take: 1
            })

            if (translations.length > 0) {
              const translation = translations.find((t) =>
                t.key.startsWith(nameKey + '.meaning.')
              )
              if (translation) {
                testName = translation.value
              }
            }
          }

          return {
            id: attempt.id,
            type: 'TEST' as const,
            testId: attempt.testId,
            testName,
            exerciseId: null,
            exerciseName: null,
            status: attempt.status,
            score: attempt.score ? Number(attempt.score) : null,
            totalQuestions,
            correctAnswers,
            incorrectAnswers,
            time: attempt.time,
            createdAt: attempt.createdAt,
            updatedAt: attempt.updatedAt
          }
        })
      )

      // Map exercise attempts
      const exerciseHistoryItems = await Promise.all(
        exerciseAttempts.map(async (attempt: any) => {
          // Lấy answer logs để tính correct/incorrect
          const answerLogs = await this.prisma.userAnswerLog.findMany({
            where: {
              userExerciseAttemptId: attempt.id
            }
          })

          const correctAnswers = answerLogs.filter((log) => log.isCorrect).length
          const incorrectAnswers = answerLogs.filter((log) => !log.isCorrect).length
          const totalQuestions = answerLogs.length

          // Lấy tên exercise
          let exerciseName = 'Bài tập'
          if (attempt.exercise?.testSet) {
            // Lấy translation cho testSet name
            const nameKey = `testset.${attempt.exercise.testSet.id}.name`
            const translationWhere: any = {
              OR: [{ key: nameKey }, { key: { startsWith: nameKey + '.meaning.' } }]
            }

            if (language) {
              const languageRecord = await this.prisma.languages.findFirst({
                where: { code: language }
              })
              if (languageRecord) {
                translationWhere.languageId = languageRecord.id
              }
            }

            const testSetTranslations = await this.prisma.translation.findMany({
              where: translationWhere,
              include: {
                language: true
              }
            })

            if (testSetTranslations.length > 0) {
              const translation = testSetTranslations.find((t) =>
                t.key.startsWith(nameKey + '.meaning.')
              )
              if (translation) {
                exerciseName = translation.value
              }
            } else {
              exerciseName = attempt.exercise.testSet.name || 'Bài tập'
            }
          }

          // Tính score (for exercises, score = correctAnswers / totalQuestions * 100)
          const score =
            totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0

          return {
            id: attempt.id,
            type: 'EXERCISE' as const,
            testId: null,
            testName: null,
            exerciseId: attempt.exerciseId,
            exerciseName,
            status: attempt.status,
            score,
            totalQuestions,
            correctAnswers,
            incorrectAnswers,
            time: attempt.time,
            createdAt: attempt.createdAt,
            updatedAt: attempt.updatedAt
          }
        })
      )

      // Merge và sort tất cả history items theo createdAt
      const allHistoryItems = [...testHistoryItems, ...exerciseHistoryItems].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )

      // Pagination
      const total = allHistoryItems.length
      const results = allHistoryItems.slice(skip, skip + pageSize)

      // Translate message
      const message = this.i18nService.translate(
        UserHistoryMessage.GET_LIST_SUCCESS,
        normalizedLang
      )

      return {
        statusCode: 200,
        message: message || 'Lấy danh sách lịch sử làm bài thành công',
        data: {
          results,
          pagination: {
            current: currentPage,
            pageSize,
            totalPage: Math.ceil(total / pageSize),
            totalItem: total
          }
        }
      }
    } catch (error) {
      this.logger.error('Error finding history:', error)
      throw error
    }
  }

  async findAllHistory(
    query: GetAdminHistoryListQueryType,
    language?: string
  ): Promise<MessageResDTO> {
    try {
      this.logger.log(
        `Admin finding all history, type: ${query.type || 'ALL'}, userId: ${query.userId || 'ALL'}`
      )

      const { currentPage = 1, pageSize = 10, type, status, userId } = query
      const skip = (currentPage - 1) * pageSize
      const normalizedLang = (language || '').toLowerCase().split('-')[0] || 'vi'

      // Build where clause cho test attempts
      const testAttemptWhere: any = {}
      if (userId) {
        testAttemptWhere.userId = userId
      }
      if (status) {
        testAttemptWhere.status = status as TestAttemptStatus
      }

      // Build where clause cho exercise attempts
      const exerciseAttemptWhere: any = {}
      if (userId) {
        exerciseAttemptWhere.userId = userId
      }
      if (status) {
        exerciseAttemptWhere.status = status as ExerciseAttemptStatus
      }

      // Lấy userTestAttempts nếu type là TEST hoặc không filter
      const testAttempts =
        type === 'TEST' || !type
          ? await this.prisma.userTestAttempt.findMany({
              where: testAttemptWhere,
              include: {
                test: true,
                user: {
                  select: {
                    id: true,
                    email: true
                  }
                }
              },
              orderBy: {
                createdAt: 'desc'
              }
            })
          : []

      // Lấy userExerciseAttempts nếu type là EXERCISE hoặc không filter
      const exerciseAttempts =
        type === 'EXERCISE' || !type
          ? await this.prisma.userExerciseAttempt.findMany({
              where: exerciseAttemptWhere,
              include: {
                exercise: {
                  include: {
                    testSet: true
                  }
                },
                user: {
                  select: {
                    id: true,
                    email: true
                  }
                }
              },
              orderBy: {
                createdAt: 'desc'
              }
            })
          : []

      // Map test attempts
      const testHistoryItems = await Promise.all(
        testAttempts.map(async (attempt: any) => {
          // Lấy answer logs để tính correct/incorrect
          const answerLogs = await this.prisma.userTestAnswerLog.findMany({
            where: {
              userTestAttemptId: attempt.id
            }
          })

          const correctAnswers = answerLogs.filter((log) => log.isCorrect).length
          const incorrectAnswers = answerLogs.filter((log) => !log.isCorrect).length
          const totalQuestions = answerLogs.length

          // Lấy tên test với i18n
          let testName = attempt.test.name || ''
          if (language) {
            const nameKey = `test.${attempt.test.id}.name`
            const translationWhere: any = {
              OR: [{ key: nameKey }, { key: { startsWith: nameKey + '.meaning.' } }]
            }

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
              include: { language: true },
              take: 1
            })

            if (translations.length > 0) {
              const translation = translations.find((t) =>
                t.key.startsWith(nameKey + '.meaning.')
              )
              if (translation) {
                testName = translation.value
              }
            }
          }

          return {
            id: attempt.id,
            type: 'TEST' as const,
            testId: attempt.testId,
            testName,
            exerciseId: null,
            exerciseName: null,
            status: attempt.status,
            score: attempt.score ? Number(attempt.score) : null,
            totalQuestions,
            correctAnswers,
            incorrectAnswers,
            time: attempt.time,
            userId: attempt.userId,
            user: {
              id: attempt.user.id,
              email: attempt.user.email
            },
            createdAt: attempt.createdAt,
            updatedAt: attempt.updatedAt
          }
        })
      )

      // Map exercise attempts
      const exerciseHistoryItems = await Promise.all(
        exerciseAttempts.map(async (attempt: any) => {
          // Lấy answer logs để tính correct/incorrect
          const answerLogs = await this.prisma.userAnswerLog.findMany({
            where: {
              userExerciseAttemptId: attempt.id
            }
          })

          const correctAnswers = answerLogs.filter((log) => log.isCorrect).length
          const incorrectAnswers = answerLogs.filter((log) => !log.isCorrect).length
          const totalQuestions = answerLogs.length

          // Lấy tên exercise
          let exerciseName = 'Bài tập'
          if (attempt.exercise?.testSet) {
            const nameKey = `testset.${attempt.exercise.testSet.id}.name`
            const translationWhere: any = {
              OR: [{ key: nameKey }, { key: { startsWith: nameKey + '.meaning.' } }]
            }

            if (language) {
              const languageRecord = await this.prisma.languages.findFirst({
                where: { code: language }
              })
              if (languageRecord) {
                translationWhere.languageId = languageRecord.id
              }
            }

            const testSetTranslations = await this.prisma.translation.findMany({
              where: translationWhere,
              include: {
                language: true
              }
            })

            if (testSetTranslations.length > 0) {
              const translation = testSetTranslations.find((t) =>
                t.key.startsWith(nameKey + '.meaning.')
              )
              if (translation) {
                exerciseName = translation.value
              }
            } else {
              exerciseName = attempt.exercise.testSet.name || 'Bài tập'
            }
          }

          // Tính score
          const score =
            totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0

          return {
            id: attempt.id,
            type: 'EXERCISE' as const,
            testId: null,
            testName: null,
            exerciseId: attempt.exerciseId,
            exerciseName,
            status: attempt.status,
            score,
            totalQuestions,
            correctAnswers,
            incorrectAnswers,
            time: attempt.time,
            userId: attempt.userId,
            user: {
              id: attempt.user.id,
              email: attempt.user.email
            },
            createdAt: attempt.createdAt,
            updatedAt: attempt.updatedAt
          }
        })
      )

      // Merge và sort tất cả history items theo createdAt
      const allHistoryItems = [...testHistoryItems, ...exerciseHistoryItems].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )

      // Pagination
      const total = allHistoryItems.length
      const results = allHistoryItems.slice(skip, skip + pageSize)

      // Translate message
      const message = this.i18nService.translate(
        UserHistoryMessage.GET_LIST_SUCCESS,
        normalizedLang
      )

      return {
        statusCode: 200,
        message: message || 'Lấy danh sách lịch sử làm bài thành công',
        data: {
          results,
          pagination: {
            current: currentPage,
            pageSize,
            totalPage: Math.ceil(total / pageSize),
            totalItem: total
          }
        }
      }
    } catch (error) {
      this.logger.error('Error finding all history (admin):', error)
      throw error
    }
  }

  async findRecentExercises(
    userId: number,
    query: GetRecentExercisesQueryType,
    language?: string
  ): Promise<MessageResDTO> {
    try {
      this.logger.log(`Finding recent exercises for user ${userId}, status: ${'ALL'}`)

      const { currentPage = 1, pageSize = 10, status } = query
      const skip = (currentPage - 1) * pageSize
      const normalizedLang = (language || '').toLowerCase().split('-')[0] || 'vi'

      let languageId: number | undefined
      try {
        const languageRecord = await this.languagesService.findByCode({
          code: normalizedLang
        })
        languageId = languageRecord?.data?.id
      } catch (error) {
        this.logger.warn(`Failed to find language for code ${normalizedLang}:`, error)
      }

      // Nếu có status filter, query với filter đó
      // Nếu không có status filter, query tất cả để có thể ưu tiên COMPLETED
      // Nhưng loại bỏ NOT_STARTED/SKIPPED vì endpoint này chỉ lấy những bài đã từng được làm hợp lệ
      const exerciseAttempts =
        await this.userHistoryRepository.findRecentExerciseAttempts({
          userId,
          status: status as ExerciseAttemptStatus | undefined
        })

      // Loại bỏ NOT_STARTED và SKIPPED (vì "recent exercises" chỉ nên là bài đã từng được làm hợp lệ)
      const filteredAttempts = status
        ? exerciseAttempts.filter((attempt) => attempt.status !== 'SKIPPED')
        : exerciseAttempts.filter(
            (attempt) => attempt.status !== 'NOT_STARTED' && attempt.status !== 'SKIPPED'
          )

      // Group attempts theo exerciseId
      const attemptsByExerciseId = new Map<number, typeof exerciseAttempts>()

      for (const attempt of filteredAttempts) {
        if (!attempt.exerciseId) {
          continue
        }

        if (!attemptsByExerciseId.has(attempt.exerciseId)) {
          attemptsByExerciseId.set(attempt.exerciseId, [])
        }
        attemptsByExerciseId.get(attempt.exerciseId)!.push(attempt)
      }

      // Với mỗi exerciseId, chọn attempt phù hợp
      const uniqueAttempts: typeof exerciseAttempts = []

      for (const [exerciseId, attempts] of attemptsByExerciseId.entries()) {
        // Đảm bảo attempts trong group được sort theo updatedAt desc (mới nhất trước)
        attempts.sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        )

        // Nếu có status filter, chỉ lấy attempts có status đó (đã được filter ở query)
        if (status) {
          // Lấy attempt mới nhất trong các attempts đã được filter
          uniqueAttempts.push(attempts[0])
        } else {
          // Không có status filter:
          // - Nếu lần làm mới nhất là COMPLETED, lấy nó
          // - Nếu lần làm mới nhất không phải COMPLETED, nhưng exercise có COMPLETED, lấy COMPLETED mới nhất
          // - Nếu exercise không có COMPLETED, lấy lần làm mới nhất
          const latestAttempt = attempts[0] // Lần làm mới nhất

          if (latestAttempt.status === 'COMPLETED') {
            // Lần làm mới nhất là COMPLETED, lấy nó
            uniqueAttempts.push(latestAttempt)
          } else {
            // Lần làm mới nhất không phải COMPLETED, kiểm tra xem có COMPLETED không
            const completedAttempts = attempts.filter((a) => a.status === 'COMPLETED')

            if (completedAttempts.length > 0) {
              // Có COMPLETED, lấy COMPLETED mới nhất
              // completedAttempts đã được sort theo updatedAt desc từ attempts
              uniqueAttempts.push(completedAttempts[0])
            } else {
              // Không có COMPLETED, lấy lần làm mới nhất
              uniqueAttempts.push(latestAttempt)
            }
          }
        }
      }

      // Sort lại theo updatedAt desc để đảm bảo thứ tự đúng
      uniqueAttempts.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )

      const total = uniqueAttempts.length
      const paginatedAttempts = uniqueAttempts.slice(skip, skip + pageSize)

      const results = await Promise.all(
        paginatedAttempts.map(async (attempt: any) => {
          let exerciseName =
            attempt.exercise?.title || attempt.exercise?.testSet?.name || 'Bài tập'

          if (attempt.exercise?.testSet) {
            const nameKey = `testset.${attempt.exercise.testSet.id}.name`

            if (languageId) {
              try {
                const translatedValue =
                  await this.translationService.resolvePreferredTranslationValue(
                    nameKey,
                    languageId
                  )

                if (translatedValue) {
                  exerciseName = translatedValue
                }
              } catch (error) {
                this.logger.warn(
                  `Failed to get translation for testset ${nameKey}:`,
                  error
                )
              }
            }

            if (
              (!exerciseName || exerciseName === nameKey) &&
              attempt.exercise.testSet.name
            ) {
              exerciseName = attempt.exercise.testSet.name
            }
          }

          // Lấy lessonId và lessonTitle
          let lessonId: number | null = null
          let lessonTitle: string | null = null

          if (attempt.exercise?.lesson) {
            lessonId = attempt.exercise.lesson.id

            if (attempt.exercise.lesson.titleKey && languageId) {
              try {
                const titleTranslation =
                  await this.translationService.findByKeyAndLanguage(
                    attempt.exercise.lesson.titleKey,
                    languageId
                  )
                if (titleTranslation?.value) {
                  lessonTitle = titleTranslation.value
                }
              } catch (error) {
                this.logger.warn(
                  `Failed to get translation for lesson ${attempt.exercise.lesson.titleKey}:`,
                  error
                )
              }
            }

            // Fallback về titleJp nếu không có translation
            if (!lessonTitle && attempt.exercise.lesson.titleJp) {
              lessonTitle = attempt.exercise.lesson.titleJp
            }
          }

          return {
            exerciseId: attempt.exerciseId,
            exerciseName,
            exerciseType: attempt.exercise?.exerciseType,
            lessonId,
            lessonTitle,
            status: attempt.status
          }
        })
      )

      const message = this.i18nService.translate(
        UserHistoryMessage.GET_LIST_SUCCESS,
        normalizedLang
      )

      return {
        statusCode: 200,
        message: message || 'Lấy danh sách bài exercise gần đây thành công',
        data: {
          results,
          pagination: {
            current: currentPage,
            pageSize,
            totalPage: Math.ceil(total / pageSize),
            totalItem: total
          }
        }
      }
    } catch (error) {
      this.logger.error('Error finding recent exercises:', error)
      throw error
    }
  }

  async findHistoryExercises(
    userId: number,
    query: GetRecentExercisesQueryType,
    language?: string
  ): Promise<MessageResDTO> {
    try {
      this.logger.log(`Finding recent exercises for user ${userId}, status: ${'ALL'}`)

      const { currentPage = 1, pageSize = 10, status } = query
      const skip = (currentPage - 1) * pageSize
      const normalizedLang = (language || '').toLowerCase().split('-')[0] || 'vi'

      let languageId: number | undefined
      try {
        const languageRecord = await this.languagesService.findByCode({
          code: normalizedLang
        })
        languageId = languageRecord?.data?.id
      } catch (error) {
        this.logger.warn(`Failed to find language for code ${normalizedLang}:`, error)
      }

      // Query attempts với status filter nếu có - lấy tất cả các lần làm
      const exerciseAttempts =
        await this.userHistoryRepository.findRecentExerciseAttempts({
          userId,
          status: status as ExerciseAttemptStatus | undefined
        })

      // Lọc bỏ attempts không có exerciseId
      const validAttempts = exerciseAttempts.filter((attempt) => attempt.exerciseId)

      // Chỉ tính các lần làm đã kết thúc (không tính NOT_STARTED, IN_PROGRESS)
      const finishedAttempts = validAttempts.filter(
        (attempt) =>
          attempt.status === ExerciseAttemptStatus.COMPLETED ||
          attempt.status === ExerciseAttemptStatus.FAILED ||
          attempt.status === ExerciseAttemptStatus.ABANDONED ||
          attempt.status === ExerciseAttemptStatus.SKIPPED
      )

      // Tính tổng thời gian của tất cả attempts (giây)
      const allTime = finishedAttempts.reduce((sum, attempt) => {
        return sum + (attempt.time || 0)
      }, 0)

      const total = finishedAttempts.length
      const paginatedAttempts = finishedAttempts.slice(skip, skip + pageSize)

      const results = await Promise.all(
        paginatedAttempts.map(async (attempt: any) => {
          const answerLogs = await this.prisma.userAnswerLog.findMany({
            where: {
              userExerciseAttemptId: attempt.id
            }
          })

          const correctAnswers = answerLogs.filter((log) => log.isCorrect).length
          const incorrectAnswers = answerLogs.filter((log) => !log.isCorrect).length
          const totalQuestions = answerLogs.length
          const score =
            totalQuestions > 0
              ? Math.round((correctAnswers / totalQuestions) * 100)
              : null

          let exerciseName =
            attempt.exercise?.title || attempt.exercise?.testSet?.name || 'Bài tập'

          if (attempt.exercise?.testSet) {
            const nameKey = `testset.${attempt.exercise.testSet.id}.name`

            if (languageId) {
              try {
                const translatedValue =
                  await this.translationService.resolvePreferredTranslationValue(
                    nameKey,
                    languageId
                  )

                if (translatedValue) {
                  exerciseName = translatedValue
                }
              } catch (error) {
                this.logger.warn(
                  `Failed to get translation for testset ${nameKey}:`,
                  error
                )
              }
            }

            if (
              (!exerciseName || exerciseName === nameKey) &&
              attempt.exercise.testSet.name
            ) {
              exerciseName = attempt.exercise.testSet.name
            }
          }

          return {
            attemptId: attempt.id,
            exerciseId: attempt.exerciseId,
            exerciseName,
            status: attempt.status,
            score,
            totalQuestions,
            correctAnswers,
            incorrectAnswers,
            updatedAt: attempt.updatedAt
          }
        })
      )

      const message = this.i18nService.translate(
        UserHistoryMessage.GET_LIST_SUCCESS,
        normalizedLang
      )

      const completedAttempts = finishedAttempts.filter(
        (attempt) => attempt.status === ExerciseAttemptStatus.COMPLETED
      ).length
      const failedAttempts = finishedAttempts.filter(
        (attempt) => attempt.status === ExerciseAttemptStatus.FAILED
      ).length
      const skippedAttempts = finishedAttempts.filter(
        (attempt) => attempt.status === ExerciseAttemptStatus.SKIPPED
      ).length
      const abandonedAttempts = finishedAttempts.filter(
        (attempt) => attempt.status === ExerciseAttemptStatus.ABANDONED
      ).length

      return {
        statusCode: 200,
        message: message || 'Lấy danh sách bài exercise gần đây thành công',
        data: {
          results,
          allTime,
          allAttempts: finishedAttempts.length,
          completedAttempts,
          failedAttempts,
          skippedAttempts,
          abandonedAttempts,
          pagination: {
            current: currentPage,
            pageSize,
            totalPage: Math.ceil(total / pageSize),
            totalItem: total
          }
        }
      }
    } catch (error) {
      this.logger.error('Error finding recent exercises:', error)
      throw error
    }
  }

  async findHistoryTests(
    userId: number,
    query: GetRecentExercisesQueryType,
    language?: string
  ): Promise<MessageResDTO> {
    try {
      this.logger.log(`Finding history tests for user ${userId}, status: ${'ALL'}`)

      const { currentPage = 1, pageSize = 10, status } = query
      const skip = (currentPage - 1) * pageSize
      const normalizedLang = (language || '').toLowerCase().split('-')[0] || 'vi'

      let languageId: number | undefined
      try {
        const languageRecord = await this.languagesService.findByCode({
          code: normalizedLang
        })
        languageId = languageRecord?.data?.id
      } catch (error) {
        this.logger.warn(`Failed to find language for code ${normalizedLang}:`, error)
      }

      // Query attempts với status filter nếu có - lấy tất cả các lần làm
      const testAttempts = await this.userHistoryRepository.findRecentTestAttempts({
        userId,
        status: status as TestAttemptStatus | undefined
      })

      // Lọc bỏ attempts không có testId
      const validAttempts = testAttempts.filter((attempt) => attempt.testId)

      // Tính tổng thời gian của tất cả attempts (giây)
      const allTime = validAttempts.reduce((sum, attempt) => {
        return sum + (attempt.time || 0)
      }, 0)

      const total = validAttempts.length
      const paginatedAttempts = validAttempts.slice(skip, skip + pageSize)

      const results = await Promise.all(
        paginatedAttempts.map(async (attempt: any) => {
          const answerLogs = await this.prisma.userTestAnswerLog.findMany({
            where: {
              userTestAttemptId: attempt.id
            }
          })

          const correctAnswers = answerLogs.filter((log) => log.isCorrect).length
          const incorrectAnswers = answerLogs.filter((log) => !log.isCorrect).length
          const totalQuestions = answerLogs.length
          const score = attempt.score
            ? Number(attempt.score)
            : totalQuestions > 0
              ? Math.round((correctAnswers / totalQuestions) * 100)
              : null

          let testName = attempt.test?.name || ''

          if (attempt.test && languageId) {
            const nameKey = `test.${attempt.test.id}.name`
            try {
              const translatedValue =
                await this.translationService.resolvePreferredTranslationValue(
                  nameKey,
                  languageId
                )

              if (translatedValue) {
                testName = translatedValue
              }
            } catch (error) {
              this.logger.warn(`Failed to get translation for test ${nameKey}:`, error)
            }
          }

          // Fallback về tên gốc nếu không có translation
          if (!testName && attempt.test?.name) {
            testName = attempt.test.name
          }

          return {
            attemptId: attempt.id,
            testId: attempt.testId,
            testType: attempt.test?.testType,
            testName,
            status: attempt.status,
            score,
            totalQuestions,
            correctAnswers,
            incorrectAnswers,
            updatedAt: attempt.updatedAt
          }
        })
      )

      const message = this.i18nService.translate(
        UserHistoryMessage.GET_LIST_SUCCESS,
        normalizedLang
      )

      return {
        statusCode: 200,
        message: message || 'Lấy danh sách bài test gần đây thành công',
        data: {
          results,
          allTime,
          allAttempts: validAttempts.length,
          completedAttempts: validAttempts.filter(
            (attempt) => attempt.status === TestAttemptStatus.COMPLETED
          ).length,
          failedAttempts: validAttempts.filter(
            (attempt) => attempt.status === TestAttemptStatus.FAILED
          ).length,
          skippedAttempts: validAttempts.filter(
            (attempt) => attempt.status === TestAttemptStatus.SKIPPED
          ).length,
          abandonedAttempts: validAttempts.filter(
            (attempt) => attempt.status === TestAttemptStatus.ABANDONED
          ).length,
          pagination: {
            current: currentPage,
            pageSize,
            totalPage: Math.ceil(total / pageSize),
            totalItem: total
          }
        }
      }
    } catch (error) {
      this.logger.error('Error finding history tests:', error)
      throw error
    }
  }
}
