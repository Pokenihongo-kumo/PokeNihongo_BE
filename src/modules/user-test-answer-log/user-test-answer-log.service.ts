import {
  CreateUserTestAnswerLogBodyType,
  GetUserTestAnswerLogListQueryType,
  UpdateUserTestAnswerLogBodyType
} from '@/modules/user-test-answer-log/entities/user-test-answer-log.entity'
import {
  AnswerLogRuleViolationException,
  AttemptNotOwnedException,
  InvalidUserTestAnswerLogDataException,
  UserTestAnswerLogNotFoundException
} from '@/modules/user-test-answer-log/dto/user-test-answer-log.error'
import { UserTestAnswerLogRepo } from '@/modules/user-test-answer-log/user-test-answer-log.repo'
import { I18nService } from '@/i18n/i18n.service'
import { UserTestAnswerLogMessage as M } from '@/i18n/message-keys'
import { toPaginationMeta } from '@/shared/utils/pagination'
import { isNotFoundPrismaError } from '@/shared/utils/prisma-errors'
import { HttpException, Injectable, Logger } from '@nestjs/common'

@Injectable()
export class UserTestAnswerLogService {
  private readonly logger = new Logger(UserTestAnswerLogService.name)

  constructor(
    private readonly userTestAnswerLogRepository: UserTestAnswerLogRepo,
    private readonly i18nService: I18nService
  ) {}

  async create(body: CreateUserTestAnswerLogBodyType, lang: string = 'vi') {
    try {
      const isCorrect = await this.checkedAnswer(body.answerId, body.questionBankId)
      const log = await this.userTestAnswerLogRepository.create(body, isCorrect)
      return {
        statusCode: 201,
        data: log,
        message: this.i18nService.translate(M.CREATE_SUCCESS, lang)
      }
    } catch (error) {
      throw this.toAnswerLogError(error)
    }
  }

  // The app's answer: the attempt is the user's, the question is in its
  // test and the answer is one of the question's. One log per question
  async upsert(
    body: CreateUserTestAnswerLogBodyType,
    userId: number,
    lang: string = 'vi'
  ) {
    try {
      const attempt = await this.userTestAnswerLogRepository.findAttempt(
        body.userTestAttemptId
      )
      // A missing attempt was a 400 "invalid data"
      if (!attempt) throw new UserTestAnswerLogNotFoundException(M.ATTEMPT_NOT_FOUND)
      if (attempt.userId !== userId) throw new AttemptNotOwnedException()
      if (attempt.testSetIds.length === 0)
        throw new AnswerLogRuleViolationException(M.TEST_HAS_NO_TEST_SET)
      if (
        !(await this.userTestAnswerLogRepository.isQuestionInTestSets(
          attempt.testSetIds,
          body.questionBankId
        ))
      ) {
        throw new AnswerLogRuleViolationException(M.QUESTION_NOT_IN_TEST)
      }
      const isCorrect = await this.checkedAnswer(body.answerId, body.questionBankId)
      const log = await this.userTestAnswerLogRepository.upsert(body, isCorrect)
      return {
        statusCode: 201,
        data: log,
        message: this.i18nService.translate(M.CREATE_SUCCESS, lang)
      }
    } catch (error) {
      throw this.toAnswerLogError(error)
    }
  }

  async findAll(query: GetUserTestAnswerLogListQueryType, lang: string = 'vi') {
    const { items, total } = await this.userTestAnswerLogRepository.findMany(query)
    return {
      statusCode: 200,
      message: this.i18nService.translate(M.GET_LIST_SUCCESS, lang),
      data: {
        results: items,
        pagination: toPaginationMeta(query.currentPage, query.pageSize, total)
      }
    }
  }

  async findOne(id: number, lang: string = 'vi') {
    const log = await this.userTestAnswerLogRepository.findUnique(id)
    if (!log) throw new UserTestAnswerLogNotFoundException()
    return {
      statusCode: 200,
      data: log,
      message: this.i18nService.translate(M.GET_SUCCESS, lang)
    }
  }

  async update(id: number, body: UpdateUserTestAnswerLogBodyType, lang: string = 'vi') {
    try {
      const log = await this.userTestAnswerLogRepository.update(id, body)
      return {
        statusCode: 200,
        data: log,
        message: this.i18nService.translate(M.UPDATE_SUCCESS, lang)
      }
    } catch (error) {
      throw this.toAnswerLogError(error)
    }
  }

  async remove(id: number, lang: string = 'vi') {
    try {
      const log = await this.userTestAnswerLogRepository.delete(id)
      return {
        statusCode: 200,
        data: log,
        message: this.i18nService.translate(M.DELETE_SUCCESS, lang)
      }
    } catch (error) {
      throw this.toAnswerLogError(error)
    }
  }

  // Used by user-test-attempt (reads data.results)
  async findByUserTestAttemptId(userTestAttemptId: number, lang: string = 'vi') {
    const logs =
      await this.userTestAnswerLogRepository.findByUserTestAttemptId(userTestAttemptId)
    return {
      statusCode: 200,
      message: this.i18nService.translate(M.GET_LIST_SUCCESS, lang),
      data: {
        results: logs,
        pagination: toPaginationMeta(1, logs.length || 1, logs.length)
      }
    }
  }

  //#region helpers
  // The answer exists and belongs to the question; returns whether it is correct
  private async checkedAnswer(answerId: number, questionBankId: number) {
    const answer = await this.userTestAnswerLogRepository.findAnswer(answerId)
    if (!answer) throw new UserTestAnswerLogNotFoundException(M.ANSWER_NOT_FOUND)
    if (answer.questionBankId !== questionBankId) {
      throw new AnswerLogRuleViolationException(M.ANSWER_NOT_IN_QUESTION)
    }
    return answer.isCorrect
  }

  private toAnswerLogError(error: unknown): HttpException {
    if (error instanceof HttpException) return error
    this.logger.error(
      'Answer log request failed',
      error instanceof Error ? error.stack : error
    )
    if (isNotFoundPrismaError(error)) return new UserTestAnswerLogNotFoundException()
    return new InvalidUserTestAnswerLogDataException()
  }
  //#endregion
}
