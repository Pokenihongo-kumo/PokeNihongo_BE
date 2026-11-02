import { UserAIConversationType } from '@/modules/user-ai-conversation/entities/user-ai-conversation.entities'
import { PrismaService } from '@/shared/services/prisma.service'
import { Injectable } from '@nestjs/common'

@Injectable()
export class UserAIConversationRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async findMany(params: {
    currentPage: number
    pageSize: number
    userId?: number
    conversationId?: string
    role?: 'USER' | 'AI'
  }) {
    const { currentPage, pageSize, userId, conversationId, role } = params

    const where: any = {
      deletedAt: null
    }

    if (userId) {
      where.userId = userId
    }

    if (conversationId) {
      where.conversationId = conversationId
    }

    if (role) {
      where.role = role
    }

    // Chỉ thêm skip và take nếu pageSize được cung cấp và hợp lệ
    const findManyOptions: any = {
      where,
      orderBy: { createdAt: 'asc' }
    }

    if (pageSize && pageSize > 0) {
      const skip = (currentPage - 1) * pageSize
      findManyOptions.skip = skip
      findManyOptions.take = pageSize
    }

    const [items, total] = await Promise.all([
      this.prismaService.userAIConversation.findMany(findManyOptions),
      this.prismaService.userAIConversation.count({ where })
    ])

    return {
      items: items.map((item) => this.transformUserAIConversation(item)),
      total,
      page: currentPage,
      limit: pageSize
    }
  }

  async findUnique(where: { id?: number }): Promise<UserAIConversationType | null> {
    if (!where.id) return null

    const result = await this.prismaService.userAIConversation.findUnique({
      where: { id: where.id }
    })

    if (!result || result.deletedAt) {
      return null
    }

    return this.transformUserAIConversation(result)
  }

  async findByConversationId(
    conversationId: string,
    userId?: number
  ): Promise<UserAIConversationType[]> {
    const where: any = {
      conversationId,
      deletedAt: null
    }

    if (userId) {
      where.userId = userId
    }

    const results = await this.prismaService.userAIConversation.findMany({
      where,
      orderBy: { createdAt: 'asc' }
    })

    return results.map((item) => this.transformUserAIConversation(item))
  }

  async create(data: {
    userId: number
    conversationId: string
    role: 'USER' | 'AI'
    message: string
    audioUrl?: string | null
  }): Promise<UserAIConversationType> {
    const result = await this.prismaService.userAIConversation.create({
      data: {
        userId: data.userId,
        conversationId: data.conversationId,
        role: data.role,
        message: data.message,
        audioUrl: data.audioUrl || null
      }
    })
    return this.transformUserAIConversation(result)
  }

  async update(
    where: { id: number },
    data: {
      message?: string
      audioUrl?: string | null
    }
  ): Promise<UserAIConversationType> {
    const result = await this.prismaService.userAIConversation.update({
      where,
      data
    })
    return this.transformUserAIConversation(result)
  }

  async delete(where: { id: number }): Promise<UserAIConversationType> {
    const result = await this.prismaService.userAIConversation.update({
      where,
      data: {
        deletedAt: new Date()
      }
    })
    return this.transformUserAIConversation(result)
  }

  async deleteByConversationId(conversationId: string, userId?: number): Promise<number> {
    const where: any = {
      conversationId,
      deletedAt: null
    }

    if (userId) {
      where.userId = userId
    }

    const result = await this.prismaService.userAIConversation.updateMany({
      where,
      data: {
        deletedAt: new Date()
      }
    })

    return result.count
  }

  private transformUserAIConversation(userAIConversation: any): UserAIConversationType {
    return {
      id: userAIConversation.id,
      userId: userAIConversation.userId,
      conversationId: userAIConversation.conversationId,
      role: userAIConversation.role,
      message: userAIConversation.message,
      audioUrl: userAIConversation.audioUrl,
      deletedAt: userAIConversation.deletedAt,
      createdAt: userAIConversation.createdAt,
      updatedAt: userAIConversation.updatedAt
    }
  }
}
