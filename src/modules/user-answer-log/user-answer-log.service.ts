import {
  CreateUserAnswerLogBodyType,
  GetUserAnswerLogByIdParamsType,
  GetUserAnswerLogListQueryType,
  UpdateUserAnswerLogBodyType
} from '@/modules/user-answer-log/entities/user-answer-log.entity'
import {
  InvalidUserAnswerLogDataException,
  UserAnswerLogNotFoundException,
  USER_ANSWER_LOG_MESSAGE
} from '@/modules/user-answer-log/dto/user-answer-log.error'
import { UserAnswerLogRepo } from '@/modules/user-answer-log/user-answer-log.repo'
import { isNotFoundPrismaError } from '@/shared/helpers'
import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common'

@Injectable()
export class UserAnswerLogService {
  private readonly logger = new Logger(UserAnswerLogService.name)

  constructor(private readonly userAnswerLogRepository: UserAnswerLogRepo) {}

  async create(body: CreateUserAnswerLogBodyType) {
    try {
      const userAnswerLog = await this.userAnswerLogRepository.create(body)

      return {
        data: userAnswerLog,
        message: USER_ANSWER_LOG_MESSAGE.CREATE_SUCCESS
      }
    } catch (error) {
      this.logger.error('Error creating user answer log:', error)
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
      throw InvalidUserAnswerLogDataException
    }
  }

  async upsert(body: CreateUserAnswerLogBodyType, userId: number) {
    try {
      const userAnswerLog = await this.userAnswerLogRepository.upsert(body, userId)

      return {
        data: userAnswerLog,
        message: USER_ANSWER_LOG_MESSAGE.CREATE_SUCCESS
      }
    } catch (error) {
      this.logger.error('Error upserting user answer log:', error)
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
      if (msg.includes('Câu hỏi không thuộc về bài tập hiện tại')) {
        throw new HttpException(
          {
            statusCode: HttpStatus.BAD_REQUEST,
            message: 'Câu hỏi không thuộc về bài tập hiện tại',
            error: 'QUESTION_NOT_IN_EXERCISE'
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
      throw InvalidUserAnswerLogDataException
    }
  }

  async findAll(query: GetUserAnswerLogListQueryType) {
    const { currentPage, pageSize, userExerciseAttemptId, questionBankId, isCorrect } =
      query

    const result = await this.userAnswerLogRepository.findMany({
      currentPage,
      pageSize,
      userExerciseAttemptId,
      questionBankId,
      isCorrect
    })

    return {
      statusCode: 200,
      message: USER_ANSWER_LOG_MESSAGE.GET_LIST_SUCCESS,
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
    const userAnswerLog = await this.userAnswerLogRepository.findUnique({
      id: id
    })

    if (!userAnswerLog) {
      throw UserAnswerLogNotFoundException
    }

    return {
      data: userAnswerLog,
      message: USER_ANSWER_LOG_MESSAGE.GET_SUCCESS
    }
  }

  async update(id: number, body: UpdateUserAnswerLogBodyType) {
    try {
      const userAnswerLog = await this.userAnswerLogRepository.update({ id }, body)

      return {
        data: userAnswerLog,
        message: USER_ANSWER_LOG_MESSAGE.UPDATE_SUCCESS
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw UserAnswerLogNotFoundException
      }
      this.logger.error('Error updating user answer log:', error)
      throw InvalidUserAnswerLogDataException
    }
  }

  async remove(id: number) {
    try {
      const userAnswerLog = await this.userAnswerLogRepository.delete({ id })

      return {
        data: userAnswerLog,
        message: USER_ANSWER_LOG_MESSAGE.DELETE_SUCCESS
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw UserAnswerLogNotFoundException
      }
      this.logger.error('Error deleting user answer log:', error)
      throw InvalidUserAnswerLogDataException
    }
  }

  async findByUserExerciseAttemptId(userExerciseAttemptId: number) {
    try {
      this.logger.log(`Finding user answer logs for attempt: ${userExerciseAttemptId}`)

      const result =
        await this.userAnswerLogRepository.findByUserExerciseAttemptId(
          userExerciseAttemptId
        )

      return {
        statusCode: 200,
        message: 'Lấy danh sách log câu trả lời thành công',
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
      this.logger.error('Error finding user answer logs by attempt:', error)
      throw error
    }
  }
}
