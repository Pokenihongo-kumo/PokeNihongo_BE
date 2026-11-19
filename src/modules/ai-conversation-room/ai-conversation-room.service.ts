import { toPaginationMeta } from '@/shared/utils/pagination'
import { isNotFoundPrismaError } from '@/shared/utils/prisma-errors'
import { HttpException, Injectable, Logger } from '@nestjs/common'
import { AIConversationRoomRepo } from './ai-conversation-room.repo'
import {
  AIConversationRoomNotFoundException,
  AIConversationTakenException,
  InvalidAIConversationRoomDataException
} from './dto/ai-conversation-room.error'
import {
  CreateAIConversationRoomInput,
  GetAIConversationRoomListQuery,
  UpdateAIConversationRoomData
} from './dto/ai-conversation-room.zod-dto'

@Injectable()
export class AIConversationRoomService {
  private readonly logger = new Logger(AIConversationRoomService.name)

  constructor(private readonly aiConversationRoomRepository: AIConversationRoomRepo) {}

  // Creates the room of a conversation, or updates the user's own one. The
  // kaiwa gateway calls this too
  async create(body: CreateAIConversationRoomInput) {
    try {
      const owner = await this.aiConversationRoomRepository.findOwnerOfConversation(
        body.conversationId
      )
      if (owner !== null && owner !== body.userId)
        throw new AIConversationTakenException()
      const room = await this.aiConversationRoomRepository.upsert(body)
      return room
    } catch (error) {
      throw this.toRoomError(error)
    }
  }

  async findAll(query: GetAIConversationRoomListQuery, userId: number) {
    const { currentPage, pageSize, isArchived } = query
    const { items, total } = await this.aiConversationRoomRepository.findMany({
      currentPage,
      pageSize,
      userId,
      isArchived
    })
    return { results: items, pagination: toPaginationMeta(currentPage, pageSize, total) }
  }

  // data is null when the user has no room for it (the gateway reads that)
  async findByConversationId(conversationId: string, userId?: number) {
    const room = await this.aiConversationRoomRepository.findByConversationId(
      conversationId,
      userId
    )
    return room
  }

  async findOne(id: string, userId: number) {
    const room = await this.ownRoom(id, userId)
    return room
  }

  async update(id: string, userId: number, body: UpdateAIConversationRoomData) {
    try {
      await this.ownRoom(id, userId)
      const room = await this.aiConversationRoomRepository.update({ id }, body)
      return room
    } catch (error) {
      throw this.toRoomError(error)
    }
  }

  // The kaiwa gateway: title, last message
  async updateByConversationId(
    conversationId: string,
    body: UpdateAIConversationRoomData
  ) {
    try {
      const room = await this.aiConversationRoomRepository.update(
        { conversationId },
        body
      )
      return room
    } catch (error) {
      throw this.toRoomError(error)
    }
  }

  async remove(id: string, userId: number) {
    try {
      await this.ownRoom(id, userId)
      const room = await this.aiConversationRoomRepository.delete(id)
      return room
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
