import { AIConversationRoomType } from '@/modules/ai-conversation-room/entities/ai-conversation-room.entities'
import { PrismaService } from '@/shared/services/prisma.service'
import { Injectable } from '@nestjs/common'

@Injectable()
export class AIConversationRoomRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async findMany(params: {
    currentPage: number
    pageSize: number
    userId?: number
    isArchived?: boolean
  }) {
    const { currentPage, pageSize, userId, isArchived } = params
    // Ensure pageSize and currentPage are numbers
    const pageSizeNum = typeof pageSize === 'string' ? parseInt(pageSize, 10) : pageSize
    const currentPageNum =
      typeof currentPage === 'string' ? parseInt(currentPage, 10) : currentPage
    const skip = (currentPageNum - 1) * pageSizeNum

    const where: any = {
      deletedAt: null
    }

    if (userId) {
      where.userId = userId
    }

    if (isArchived !== undefined) {
      where.isArchived = isArchived
    }

    const [items, total] = await Promise.all([
      this.prismaService.aIConversationRoom.findMany({
        where,
        skip,
        take: pageSizeNum,
        orderBy: { lastMessageAt: 'desc' } // Mới nhất trước
      }),
      this.prismaService.aIConversationRoom.count({ where })
    ])

    return {
      items: items.map((item) => this.transformAIConversationRoom(item)),
      total,
      page: currentPageNum,
      limit: pageSizeNum
    }
  }

  async findUnique(where: {
    id?: string
    conversationId?: string
  }): Promise<AIConversationRoomType | null> {
    if (!where.id && !where.conversationId) return null

    const whereClause: any = {}
    if (where.id) {
      whereClause.id = where.id
    } else if (where.conversationId) {
      whereClause.conversationId = where.conversationId
    }

    const result = await this.prismaService.aIConversationRoom.findUnique({
      where: whereClause
    })

    if (!result || result.deletedAt) {
      return null
    }

    return this.transformAIConversationRoom(result)
  }

  async findByConversationId(
    conversationId: string,
    userId?: number
  ): Promise<AIConversationRoomType | null> {
    const where: any = {
      conversationId,
      deletedAt: null
    }

    if (userId) {
      where.userId = userId
    }

    const result = await this.prismaService.aIConversationRoom.findFirst({
      where
    })

    if (!result) {
      return null
    }

    return this.transformAIConversationRoom(result)
  }

  async create(data: {
    userId: number
    conversationId: string
    title?: string | null
    voiceName?: string | null
  }): Promise<AIConversationRoomType> {
    const result = await this.prismaService.aIConversationRoom.create({
      data: {
        userId: data.userId,
        conversationId: data.conversationId,
        title: data.title || null,
        voiceName: data.voiceName || 'ja-JP-Wavenet-A'
      }
    })
    return this.transformAIConversationRoom(result)
  }

  async upsert(data: {
    userId: number
    conversationId: string
    title?: string | null
    voiceName?: string | null
  }): Promise<AIConversationRoomType> {
    const result = await this.prismaService.aIConversationRoom.upsert({
      where: {
        conversationId: data.conversationId
      },
      create: {
        userId: data.userId,
        conversationId: data.conversationId,
        title: data.title || null,
        voiceName: data.voiceName || 'ja-JP-Wavenet-A'
      },
      update: {
        title: data.title || undefined,
        voiceName:
          data.voiceName !== undefined ? data.voiceName || 'ja-JP-Wavenet-A' : undefined
      }
    })
    return this.transformAIConversationRoom(result)
  }

  async update(
    where: { id?: string; conversationId?: string },
    data: {
      title?: string | null
      lastMessage?: string | null
      lastMessageAt?: Date | null
      isArchived?: boolean
      voiceName?: string | null
    }
  ): Promise<AIConversationRoomType> {
    const whereClause: any = {}
    if (where.id) {
      whereClause.id = where.id
    } else if (where.conversationId) {
      whereClause.conversationId = where.conversationId
    }

    const result = await this.prismaService.aIConversationRoom.update({
      where: whereClause,
      data
    })
    return this.transformAIConversationRoom(result)
  }

  async delete(where: {
    id?: string
    conversationId?: string
  }): Promise<AIConversationRoomType> {
    const whereClause: any = {}
    if (where.id) {
      whereClause.id = where.id
    } else if (where.conversationId) {
      whereClause.conversationId = where.conversationId
    }

    const result = await this.prismaService.aIConversationRoom.update({
      where: whereClause,
      data: {
        deletedAt: new Date()
      }
    })
    return this.transformAIConversationRoom(result)
  }

  private transformAIConversationRoom(room: any): AIConversationRoomType {
    return {
      id: room.id,
      userId: room.userId,
      conversationId: room.conversationId,
      title: room.title,
      lastMessage: room.lastMessage,
      lastMessageAt: room.lastMessageAt,
      isArchived: room.isArchived,
      voiceName: room.voiceName,
      deletedAt: room.deletedAt,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt
    }
  }
}
