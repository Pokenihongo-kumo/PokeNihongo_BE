import {
  CreateUserTestAnswerLogBodyType,
  GetUserTestAnswerLogByIdParamsType,
  GetUserTestAnswerLogListQueryType,
  UpdateUserTestAnswerLogBodyType
} from '@/modules/user-test-answer-log/entities/user-test-answer-log.entities'
import {
  InvalidUserTestAnswerLogDataException,
  UserTestAnswerLogNotFoundException
} from '@/modules/user-test-answer-log/dto/user-test-answer-log.error'
import { USER_TEST_ANSWER_LOG_MESSAGE } from '@/common/constants/message'
import { UserTestAnswerLogRepository } from '@/modules/user-test-answer-log/user-test-answer-log.repo'
import { isNotFoundPrismaError } from '@/shared/helpers'
import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common'

@Injectable()
export class UserTestAnswerLogService {
  private readonly logger = new Logger(UserTestAnswerLogService.name)

  constructor(
    private readonly userTestAnswerLogRepository: UserTestAnswerLogRepository
  ) {}

  async create(body: CreateUserTestAnswerLogBodyType) {
    try {
      const userTestAnswerLog = await this.userTestAnswerLogRepository.create(body)

      return {
        data: userTestAnswerLog,
        message: USER_TEST_ANSWER_LOG_MESSAGE.CREATE_SUCCESS
      }
    } catch (error) {
      this.logger.error('Error creating user test answer log:', error)
      // Preserve specific validation message from repository
      const msg = (error as any)?.message || ''
      if (msg.includes('Đáp án không thuộc về câu hỏi đã chọn')) {
        throw new HttpException(
          {
            statusCode: HttpStatus.BAD_REQUEST,
            message: 'Đáp án không thuộc về câu hỏi đã chọn',
            error: 'ANSWER_NOT_IN_QUESTION'
          },
          HttpStatus.BAD_REQUEST
        )
      }
      throw InvalidUserTestAnswerLogDataException
    }
  }

  async upsert(body: CreateUserTestAnswerLogBodyType, userId: number) {
    try {
      const userTestAnswerLog = await this.userTestAnswerLogRepository.upsert(
        body,
        userId
      )

      return {
        data: userTestAnswerLog,
        message: USER_TEST_ANSWER_LOG_MESSAGE.CREATE_SUCCESS
      }
    } catch (error) {
      this.logger.error('Error upserting user test answer log:', error)
      // Preserve specific validation message from repository
      const msg = (error as any)?.message || ''
      if (msg.includes('Đáp án không thuộc về câu hỏi đã chọn')) {
        throw new HttpException(
          {
            statusCode: HttpStatus.BAD_REQUEST,
            message: 'Đáp án không thuộc về câu hỏi đã chọn',
            error: 'ANSWER_NOT_IN_QUESTION'
          },
          HttpStatus.BAD_REQUEST
        )
      }
      if (msg.includes('Câu hỏi không thuộc về bài test hiện tại')) {
        throw new HttpException(
          {
            statusCode: HttpStatus.BAD_REQUEST,
            message: 'Câu hỏi không thuộc về bài test hiện tại',
            error: 'QUESTION_NOT_IN_TEST'
          },
          HttpStatus.BAD_REQUEST
        )
      }
      if (msg.includes('Attempt không thuộc về người dùng')) {
        throw new HttpException(
          {
            statusCode: HttpStatus.FORBIDDEN,
            message: 'Bạn không có quyền ghi log cho lần thử này',
            error: 'ATTEMPT_OWNERSHIP_MISMATCH'
          },
          HttpStatus.FORBIDDEN
        )
      }
      throw InvalidUserTestAnswerLogDataException
    }
  }

  async findAll(query: GetUserTestAnswerLogListQueryType) {
    const { currentPage, pageSize, userTestAttemptId, questionBankId, isCorrect } = query

    const result = await this.userTestAnswerLogRepository.findMany({
      currentPage,
      pageSize,
      userTestAttemptId,
      questionBankId,
      isCorrect
    })

    return {
      statusCode: 200,
      message: USER_TEST_ANSWER_LOG_MESSAGE.GET_LIST_SUCCESS,
      data: {
        results: result.items,
        pagination: {
          current: result.page,
          pageSize: result.limit,
          totalPage: Math.ceil(result.total / result.limit),
          totalItem: result.total
        }
      }
    }
  }

  async findOne(id: number) {
    const userTestAnswerLog = await this.userTestAnswerLogRepository.findUnique({
      id: id
    })

    if (!userTestAnswerLog) {
      throw UserTestAnswerLogNotFoundException
    }

    return {
      data: userTestAnswerLog,
      message: USER_TEST_ANSWER_LOG_MESSAGE.GET_SUCCESS
    }
  }

  async update(id: number, body: UpdateUserTestAnswerLogBodyType) {
    try {
      const userTestAnswerLog = await this.userTestAnswerLogRepository.update(
        { id },
        body
      )

      return {
        data: userTestAnswerLog,
        message: USER_TEST_ANSWER_LOG_MESSAGE.UPDATE_SUCCESS
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw UserTestAnswerLogNotFoundException
      }
      this.logger.error('Error updating user test answer log:', error)
      throw InvalidUserTestAnswerLogDataException
    }
  }

  async remove(id: number) {
    try {
      const userTestAnswerLog = await this.userTestAnswerLogRepository.delete({ id })

      return {
        data: userTestAnswerLog,
        message: USER_TEST_ANSWER_LOG_MESSAGE.DELETE_SUCCESS
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw UserTestAnswerLogNotFoundException
      }
      this.logger.error('Error deleting user test answer log:', error)
      throw InvalidUserTestAnswerLogDataException
    }
  }

  async findByUserTestAttemptId(userTestAttemptId: number) {
    try {
      this.logger.log(`Finding user test answer logs for attempt: ${userTestAttemptId}`)

      const result =
        await this.userTestAnswerLogRepository.findByUserTestAttemptId(userTestAttemptId)

      return {
        statusCode: 200,
        message: 'Lấy danh sách log câu trả lời test thành công',
        data: {
          results: result,
          pagination: {
            current: 1,
            pageSize: result.length,
            totalPage: 1,
            totalItem: result.length
          }
        }
      }
    } catch (error) {
      this.logger.error('Error finding user test answer logs by attempt:', error)
      throw error
    }
  }
}
