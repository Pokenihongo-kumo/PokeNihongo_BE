import { toPaginationMeta } from '@/shared/utils/pagination'
import { isNotFoundPrismaError } from '@/shared/utils/prisma-errors'
import { HttpException, Injectable, Logger } from '@nestjs/common'
import {
  InvalidUserAIConversationDataException,
  UserAIConversationNotFoundException
} from './dto/user-ai-conversation.error'
import {
  CreateUserAIConversationInput,
  GetUserAIConversationListQuery,
  UpdateUserAIConversationBody
} from './dto/user-ai-conversation.zod-dto'
import { UserAIConversationRepo } from './user-ai-conversation.repo'

@Injectable()
export class UserAIConversationService {
  private readonly logger = new Logger(UserAIConversationService.name)

  constructor(private readonly userAIConversationRepository: UserAIConversationRepo) {}

  async create(body: CreateUserAIConversationInput) {
    try {
      const row = await this.userAIConversationRepository.create(body)
      return row
    } catch (error) {
      throw this.toMessageError(error)
    }
  }

  async findAll(query: GetUserAIConversationListQuery, userId: number) {
    const { currentPage, pageSize, conversationId, role } = query
    const { items, total } = await this.userAIConversationRepository.findMany({
      currentPage,
      pageSize,
      userId,
      conversationId,
      role
    })
    return { results: items, pagination: toPaginationMeta(currentPage, pageSize, total) }
  }

  async findByConversationId(conversationId: string, userId: number) {
    const rows = await this.userAIConversationRepository.findByConversationId(
      conversationId,
      userId
    )
    return rows
  }

  async findOne(id: number, userId: number) {
    const row = await this.ownMessage(id, userId)
    return row
  }

  // The user's own message (REST)
  async updateOwned(id: number, userId: number, body: UpdateUserAIConversationBody) {
    await this.ownMessage(id, userId)
    return this.update(id, body)
  }

  // The kaiwa gateway sets the audio of a message it wrote
  async update(id: number, body: UpdateUserAIConversationBody) {
    try {
      const row = await this.userAIConversationRepository.update(id, body)
      return row
    } catch (error) {
      throw this.toMessageError(error)
    }
  }

  async remove(id: number, userId: number) {
    try {
      await this.ownMessage(id, userId)
      const row = await this.userAIConversationRepository.delete(id)
      return row
    } catch (error) {
      throw this.toMessageError(error)
    }
  }

  async removeByConversationId(conversationId: string, userId: number) {
    const count = await this.userAIConversationRepository.deleteByConversationId(
      conversationId,
      userId
    )
    return { deletedCount: count }
  }

  //#region helpers
  // Another user's message is "not found"
  private async ownMessage(id: number, userId: number) {
    const row = await this.userAIConversationRepository.findOwned(id, userId)
    if (!row) throw new UserAIConversationNotFoundException()
    return row
  }

  private toMessageError(error: unknown): HttpException {
    if (error instanceof HttpException) return error
    this.logger.error(
      'AI conversation message request failed',
      error instanceof Error ? error.stack : error
    )
    if (isNotFoundPrismaError(error)) return new UserAIConversationNotFoundException()
    return new InvalidUserAIConversationDataException()
  }
  //#endregion
}
