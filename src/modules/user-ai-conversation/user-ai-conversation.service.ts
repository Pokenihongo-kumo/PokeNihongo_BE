import {
  CreateUserAIConversationBodyType,
  GetUserAIConversationByIdParamsType,
  GetUserAIConversationListQueryType,
  UpdateUserAIConversationBodyType
} from '@/modules/user-ai-conversation/entities/user-ai-conversation.entities'
import {
  InvalidUserAIConversationDataException,
  UserAIConversationNotFoundException
} from '@/modules/user-ai-conversation/dto/user-ai-conversation.error'
import { UserAIConversationRepository } from '@/modules/user-ai-conversation/user-ai-conversation.repo'
import { isNotFoundPrismaError } from '@/shared/helpers'
import { Injectable, Logger, HttpException } from '@nestjs/common'

@Injectable()
export class UserAIConversationService {
  private readonly logger = new Logger(UserAIConversationService.name)

  constructor(
    private readonly userAIConversationRepository: UserAIConversationRepository
  ) {}

  async create(body: CreateUserAIConversationBodyType) {
    try {
      const userAIConversation = await this.userAIConversationRepository.create(body)

      return {
        data: userAIConversation,
        message: 'Tạo cuộc hội thoại AI thành công'
      }
    } catch (error) {
      this.logger.error('Error creating user AI conversation:', error)
      if (
        error instanceof HttpException ||
        error.message?.includes('không tồn tại') ||
        error.message?.includes('đã tồn tại')
      ) {
        throw error
      }
      throw InvalidUserAIConversationDataException
    }
  }

  async findAll(query: GetUserAIConversationListQueryType, userId?: number) {
    const { currentPage, pageSize, conversationId, role } = query

    const result = await this.userAIConversationRepository.findMany({
      currentPage,
      pageSize,
      userId,
      conversationId,
      role
    })

    return {
      statusCode: 200,
      message: 'Lấy danh sách cuộc hội thoại AI thành công',
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

  async findByConversationId(conversationId: string, userId?: number) {
    const results = await this.userAIConversationRepository.findByConversationId(
      conversationId,
      userId
    )

    return {
      statusCode: 200,
      message: 'Lấy danh sách cuộc hội thoại AI thành công',
      data: results
    }
  }

  async findOne(params: GetUserAIConversationByIdParamsType) {
    const userAIConversation = await this.userAIConversationRepository.findUnique({
      id: params.id
    })

    if (!userAIConversation) {
      throw UserAIConversationNotFoundException
    }

    return {
      data: userAIConversation,
      message: 'Lấy thông tin cuộc hội thoại AI thành công'
    }
  }

  async update(id: number, body: UpdateUserAIConversationBodyType) {
    try {
      const userAIConversation = await this.userAIConversationRepository.update(
        { id },
        body
      )

      return {
        data: userAIConversation,
        message: 'Cập nhật cuộc hội thoại AI thành công'
      }
    } catch (error) {
      this.logger.error('Error updating user AI conversation:', error)
      if (isNotFoundPrismaError(error)) {
        throw UserAIConversationNotFoundException
      }
      if (error instanceof HttpException || error.message?.includes('không tồn tại')) {
        throw error
      }
      throw InvalidUserAIConversationDataException
    }
  }

  async remove(id: number) {
    try {
      const userAIConversation = await this.userAIConversationRepository.delete({ id })

      return {
        data: userAIConversation,
        message: 'Xóa cuộc hội thoại AI thành công'
      }
    } catch (error) {
      this.logger.error('Error deleting user AI conversation:', error)
      if (isNotFoundPrismaError(error)) {
        throw UserAIConversationNotFoundException
      }
      if (error instanceof HttpException || error.message?.includes('không tồn tại')) {
        throw error
      }
      throw InvalidUserAIConversationDataException
    }
  }

  async removeByConversationId(conversationId: string, userId?: number) {
    try {
      const count = await this.userAIConversationRepository.deleteByConversationId(
        conversationId,
        userId
      )

      return {
        data: { deletedCount: count },
        message: `Xóa ${count} cuộc hội thoại AI thành công`
      }
    } catch (error) {
      this.logger.error('Error deleting user AI conversations by conversationId:', error)
      throw InvalidUserAIConversationDataException
    }
  }
}
