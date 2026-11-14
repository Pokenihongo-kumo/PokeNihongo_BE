import {
  InvalidUserAIConversationDataException,
  UserAIConversationNotFoundException
} from '@/modules/user-ai-conversation/dto/user-ai-conversation.error'
import {
  CreateUserAIConversationInput,
  GetUserAIConversationListQueryType,
  UpdateUserAIConversationBodyType
} from '@/modules/user-ai-conversation/entities/user-ai-conversation.entity'
import { UserAIConversationRepo } from '@/modules/user-ai-conversation/user-ai-conversation.repo'
import { I18nService } from '@/i18n/i18n.service'
import { UserAIConversationMessage as M } from '@/i18n/message-keys'
import { toPaginationMeta } from '@/shared/utils/pagination'
import { isNotFoundPrismaError } from '@/shared/utils/prisma-errors'
import { HttpException, Injectable, Logger } from '@nestjs/common'

@Injectable()
export class UserAIConversationService {
  private readonly logger = new Logger(UserAIConversationService.name)

  constructor(
    private readonly userAIConversationRepository: UserAIConversationRepo,
    private readonly i18nService: I18nService
  ) {}

  async create(body: CreateUserAIConversationInput, lang = 'vi') {
    try {
      const row = await this.userAIConversationRepository.create(body)
      return {
        statusCode: 201,
        data: row,
        message: this.i18nService.translate(M.CREATE_SUCCESS, lang)
      }
    } catch (error) {
      throw this.toMessageError(error)
    }
  }

  async findAll(query: GetUserAIConversationListQueryType, userId: number, lang = 'vi') {
    const { currentPage, pageSize, conversationId, role } = query
    const { items, total } = await this.userAIConversationRepository.findMany({
      currentPage,
      pageSize,
      userId,
      conversationId,
      role
    })
    return {
      statusCode: 200,
      message: this.i18nService.translate(M.GET_LIST_SUCCESS, lang),
      data: { results: items, pagination: toPaginationMeta(currentPage, pageSize, total) }
    }
  }

  async findByConversationId(conversationId: string, userId: number, lang = 'vi') {
    const rows = await this.userAIConversationRepository.findByConversationId(
      conversationId,
      userId
    )
    return {
      statusCode: 200,
      message: this.i18nService.translate(M.GET_LIST_SUCCESS, lang),
      data: rows
    }
  }

  async findOne(id: number, userId: number, lang = 'vi') {
    const row = await this.ownMessage(id, userId)
    return {
      statusCode: 200,
      data: row,
      message: this.i18nService.translate(M.GET_SUCCESS, lang)
    }
  }

  // The user's own message (REST)
  async updateOwned(
    id: number,
    userId: number,
    body: UpdateUserAIConversationBodyType,
    lang = 'vi'
  ) {
    await this.ownMessage(id, userId)
    return this.update(id, body, lang)
  }

  // The kaiwa gateway sets the audio of a message it wrote
  async update(id: number, body: UpdateUserAIConversationBodyType, lang = 'vi') {
    try {
      const row = await this.userAIConversationRepository.update(id, body)
      return {
        statusCode: 200,
        data: row,
        message: this.i18nService.translate(M.UPDATE_SUCCESS, lang)
      }
    } catch (error) {
      throw this.toMessageError(error)
    }
  }

  async remove(id: number, userId: number, lang = 'vi') {
    try {
      await this.ownMessage(id, userId)
      const row = await this.userAIConversationRepository.delete(id)
      return {
        statusCode: 200,
        data: row,
        message: this.i18nService.translate(M.DELETE_SUCCESS, lang)
      }
    } catch (error) {
      throw this.toMessageError(error)
    }
  }

  async removeByConversationId(conversationId: string, userId: number, lang = 'vi') {
    const count = await this.userAIConversationRepository.deleteByConversationId(
      conversationId,
      userId
    )
    return {
      statusCode: 200,
      data: { deletedCount: count },
      message: this.i18nService.translate(M.DELETE_BY_CONVERSATION_SUCCESS, lang, {
        count
      })
    }
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
