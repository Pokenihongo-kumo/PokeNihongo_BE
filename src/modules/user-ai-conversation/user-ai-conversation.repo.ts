import { UserAIConversation } from '@/modules/user-ai-conversation/entities/user-ai-conversation.entity'
import { PrismaService } from '@/shared/services/prisma.service'
import { toSkipTake } from '@/shared/utils/pagination'
import { Injectable } from '@nestjs/common'
import { Prisma, UserAIConversation as PrismaUserAIConversation } from '@prisma/client'

const toMessage = (row: PrismaUserAIConversation): UserAIConversation => ({
  id: row.id,
  userId: row.userId,
  conversationId: row.conversationId,
  role: row.role as UserAIConversation['role'],
  message: row.message,
  audioUrl: row.audioUrl,
  deletedAt: row.deletedAt,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt
})

@Injectable()
export class UserAIConversationRepo {
  constructor(private readonly prismaService: PrismaService) {}

  async findMany(params: {
    currentPage: number
    pageSize: number
    userId: number
    conversationId?: string
    role?: 'USER' | 'AI'
  }) {
    const where: Prisma.UserAIConversationWhereInput = {
      deletedAt: null,
      userId: params.userId,
      ...(params.conversationId && { conversationId: params.conversationId }),
      ...(params.role && { role: params.role })
    }
    const [items, total] = await Promise.all([
      this.prismaService.userAIConversation.findMany({
        where,
        ...toSkipTake(params.currentPage, params.pageSize),
        orderBy: { createdAt: 'asc' }
      }),
      this.prismaService.userAIConversation.count({ where })
    ])
    return { items: items.map(toMessage), total }
  }

  // The user's message, not deleted
  async findOwned(id: number, userId: number): Promise<UserAIConversation | null> {
    const row = await this.prismaService.userAIConversation.findFirst({
      where: { id, userId, deletedAt: null }
    })
    return row ? toMessage(row) : null
  }

  async findByConversationId(conversationId: string, userId: number) {
    const rows = await this.prismaService.userAIConversation.findMany({
      where: { conversationId, userId, deletedAt: null },
      orderBy: { createdAt: 'asc' }
    })
    return rows.map(toMessage)
  }

  async create(data: {
    userId: number
    conversationId: string
    role: 'USER' | 'AI'
    message: string
    audioUrl?: string | null
  }): Promise<UserAIConversation> {
    return toMessage(
      await this.prismaService.userAIConversation.create({
        data: { ...data, audioUrl: data.audioUrl || null }
      })
    )
  }

  async update(
    id: number,
    data: { message?: string; audioUrl?: string | null }
  ): Promise<UserAIConversation> {
    return toMessage(
      await this.prismaService.userAIConversation.update({ where: { id }, data })
    )
  }

  // Soft delete
  async delete(id: number): Promise<UserAIConversation> {
    return toMessage(
      await this.prismaService.userAIConversation.update({
        where: { id },
        data: { deletedAt: new Date() }
      })
    )
  }

  async deleteByConversationId(conversationId: string, userId: number): Promise<number> {
    const { count } = await this.prismaService.userAIConversation.updateMany({
      where: { conversationId, userId, deletedAt: null },
      data: { deletedAt: new Date() }
    })
    return count
  }
}
