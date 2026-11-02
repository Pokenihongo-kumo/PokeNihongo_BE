import {
  CreateAIConversationRoomBodyType,
  GetAIConversationRoomByIdParamsType,
  GetAIConversationRoomListQueryType,
  UpdateAIConversationRoomBodyType
} from '@/modules/ai-conversation-room/entities/ai-conversation-room.entities'
import {
  InvalidAIConversationRoomDataException,
  AIConversationRoomNotFoundException
} from '@/modules/ai-conversation-room/dto/ai-conversation-room.error'
import { AIConversationRoomRepository } from '@/modules/ai-conversation-room/ai-conversation-room.repo'
import { isNotFoundPrismaError } from '@/shared/helpers'
import { Injectable, Logger, HttpException } from '@nestjs/common'

@Injectable()
export class AIConversationRoomService {
  private readonly logger = new Logger(AIConversationRoomService.name)

  constructor(
    private readonly aiConversationRoomRepository: AIConversationRoomRepository
  ) {}

  async create(body: CreateAIConversationRoomBodyType) {
    try {
      const room = await this.aiConversationRoomRepository.upsert({
        userId: body.userId,
        conversationId: body.conversationId,
        title: body.title || null,
        voiceName: body.voiceName || 'ja-JP-Wavenet-A'
      })

      return {
        data: room,
        message: 'Tạo phòng hội thoại AI thành công'
      }
    } catch (error) {
      this.logger.error('Error creating AI conversation room:', error)
      if (
        error instanceof HttpException ||
        error.message?.includes('không tồn tại') ||
        error.message?.includes('đã tồn tại')
      ) {
        throw error
      }
      throw InvalidAIConversationRoomDataException
    }
  }

  async findAll(query: GetAIConversationRoomListQueryType, userId?: number) {
    try {
      const { currentPage, pageSize, isArchived } = query

      this.logger.log(
        `[AIConversationRoom] findAll - userId: ${userId}, currentPage: ${currentPage}, pageSize: ${pageSize}`
      )

      const result = await this.aiConversationRoomRepository.findMany({
        currentPage,
        pageSize,
        userId,
        isArchived
      })

      this.logger.log(
        `[AIConversationRoom] Found ${result.items.length} rooms, total: ${result.total}`
      )

      return {
        statusCode: 200,
        message: 'Lấy danh sách phòng hội thoại AI thành công',
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
    } catch (error) {
      this.logger.error(
        `[AIConversationRoom] Error in findAll: ${error.message}`,
        error.stack
      )
      throw error
    }
  }

  async findByConversationId(conversationId: string, userId?: number) {
    const room = await this.aiConversationRoomRepository.findByConversationId(
      conversationId,
      userId
    )

    return {
      statusCode: 200,
      message: 'Lấy thông tin phòng hội thoại AI thành công',
      data: room
    }
  }

  async findOne(params: GetAIConversationRoomByIdParamsType) {
    const room = await this.aiConversationRoomRepository.findUnique({
      id: params.id
    })

    if (!room) {
      throw AIConversationRoomNotFoundException
    }

    return {
      data: room,
      message: 'Lấy thông tin phòng hội thoại AI thành công'
    }
  }

  async update(id: string, body: UpdateAIConversationRoomBodyType) {
    try {
      const room = await this.aiConversationRoomRepository.update({ id }, body)

      return {
        data: room,
        message: 'Cập nhật phòng hội thoại AI thành công'
      }
    } catch (error) {
      this.logger.error('Error updating AI conversation room:', error)
      if (isNotFoundPrismaError(error)) {
        throw AIConversationRoomNotFoundException
      }
      if (error instanceof HttpException || error.message?.includes('không tồn tại')) {
        throw error
      }
      throw InvalidAIConversationRoomDataException
    }
  }

  async updateByConversationId(
    conversationId: string,
    body: UpdateAIConversationRoomBodyType
  ) {
    try {
      const room = await this.aiConversationRoomRepository.update(
        { conversationId },
        body
      )

      return {
        data: room,
        message: 'Cập nhật phòng hội thoại AI thành công'
      }
    } catch (error) {
      this.logger.error('Error updating AI conversation room by conversationId:', error)
      if (isNotFoundPrismaError(error)) {
        throw AIConversationRoomNotFoundException
      }
      if (error instanceof HttpException || error.message?.includes('không tồn tại')) {
        throw error
      }
      throw InvalidAIConversationRoomDataException
    }
  }

  async remove(id: string) {
    try {
      const room = await this.aiConversationRoomRepository.delete({ id })

      return {
        data: room,
        message: 'Xóa phòng hội thoại AI thành công'
      }
    } catch (error) {
      this.logger.error('Error deleting AI conversation room:', error)
      if (isNotFoundPrismaError(error)) {
        throw AIConversationRoomNotFoundException
      }
      if (error instanceof HttpException || error.message?.includes('không tồn tại')) {
        throw error
      }
      throw InvalidAIConversationRoomDataException
    }
  }
}
