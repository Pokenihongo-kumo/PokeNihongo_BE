import { I18nService } from '@/i18n/i18n.service'
import { AIConversationRoomMessage as M } from '@/i18n/message-keys'
import { AIConversationRoomRepo } from '@/modules/ai-conversation-room/ai-conversation-room.repo'
import {
  AIConversationRoomNotFoundException,
  AIConversationTakenException,
  InvalidAIConversationRoomDataException
} from '@/modules/ai-conversation-room/dto/ai-conversation-room.error'
import {
  CreateAIConversationRoomInput,
  GetAIConversationRoomListQuery,
  UpdateAIConversationRoomData
} from '@/modules/ai-conversation-room/entities/ai-conversation-room.entity'
import { toPaginationMeta } from '@/shared/utils/pagination'
import { isNotFoundPrismaError } from '@/shared/utils/prisma-errors'
import { HttpException, Injectable, Logger } from '@nestjs/common'

@Injectable()
export class AIConversationRoomService {
  private readonly logger = new Logger(AIConversationRoomService.name)

  constructor(
    private readonly aiConversationRoomRepository: AIConversationRoomRepo,
    private readonly i18nService: I18nService
  ) {}

  // Creates the room of a conversation, or updates the user's own one. The
  // kaiwa gateway calls this too
  async create(body: CreateAIConversationRoomInput, lang: string = 'vi') {
    try {
      const owner = await this.aiConversationRoomRepository.findOwnerOfConversation(
        body.conversationId
      )
      if (owner !== null && owner !== body.userId)
        throw new AIConversationTakenException()
      const room = await this.aiConversationRoomRepository.upsert(body)
      return {
        statusCode: 201,
        data: room,
        message: this.i18nService.translate(M.CREATE_SUCCESS, lang)
      }
    } catch (error) {
      throw this.toRoomError(error)
    }
  }

  async findAll(query: GetAIConversationRoomListQuery, userId: number, lang = 'vi') {
    const { currentPage, pageSize, isArchived } = query
    const { items, total } = await this.aiConversationRoomRepository.findMany({
      currentPage,
      pageSize,
      userId,
      isArchived
    })
    return {
      statusCode: 200,
      message: this.i18nService.translate(M.GET_LIST_SUCCESS, lang),
      data: { results: items, pagination: toPaginationMeta(currentPage, pageSize, total) }
    }
  }

  // data is null when the user has no room for it (the gateway reads that)
  async findByConversationId(conversationId: string, userId?: number, lang = 'vi') {
    const room = await this.aiConversationRoomRepository.findByConversationId(
      conversationId,
      userId
    )
    return {
      statusCode: 200,
      message: this.i18nService.translate(M.GET_SUCCESS, lang),
      data: room
    }
  }

  async findOne(id: string, userId: number, lang = 'vi') {
    const room = await this.ownRoom(id, userId)
    return {
      statusCode: 200,
      data: room,
      message: this.i18nService.translate(M.GET_SUCCESS, lang)
    }
  }

  async update(
    id: string,
    userId: number,
    body: UpdateAIConversationRoomData,
    lang = 'vi'
  ) {
    try {
      await this.ownRoom(id, userId)
      const room = await this.aiConversationRoomRepository.update({ id }, body)
      return {
        statusCode: 200,
        data: room,
        message: this.i18nService.translate(M.UPDATE_SUCCESS, lang)
      }
    } catch (error) {
      throw this.toRoomError(error)
    }
  }

  // The kaiwa gateway: title, last message
  async updateByConversationId(
    conversationId: string,
    body: UpdateAIConversationRoomData,
    lang = 'vi'
  ) {
    try {
      const room = await this.aiConversationRoomRepository.update(
        { conversationId },
        body
      )
      return {
        statusCode: 200,
        data: room,
        message: this.i18nService.translate(M.UPDATE_SUCCESS, lang)
      }
    } catch (error) {
      throw this.toRoomError(error)
    }
  }

  async remove(id: string, userId: number, lang = 'vi') {
    try {
      await this.ownRoom(id, userId)
      const room = await this.aiConversationRoomRepository.delete(id)
      return {
        statusCode: 200,
        data: room,
        message: this.i18nService.translate(M.DELETE_SUCCESS, lang)
      }
    } catch (error) {
      throw this.toRoomError(error)
    }
  }

  //#region helpers
  // Another user's room is "not found"
  private async ownRoom(id: string, userId: number) {
    const room = await this.aiConversationRoomRepository.findOwned(id, userId)
    if (!room) throw new AIConversationRoomNotFoundException()
    return room
  }

  private toRoomError(error: unknown): HttpException {
    if (error instanceof HttpException) return error
    this.logger.error(
      'AI conversation room request failed',
      error instanceof Error ? error.stack : error
    )
    if (isNotFoundPrismaError(error)) return new AIConversationRoomNotFoundException()
    return new InvalidAIConversationRoomDataException()
  }
  //#endregion
}
