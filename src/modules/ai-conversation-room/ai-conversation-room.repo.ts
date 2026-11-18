import { PrismaService } from '@/shared/services/prisma.service'
import { toSkipTake } from '@/shared/utils/pagination'
import { Injectable } from '@nestjs/common'
import { Prisma, AIConversationRoom as PrismaAIConversationRoom } from '@prisma/client'
import { UpdateAIConversationRoomData } from './dto/ai-conversation-room.zod-dto'
import { AIConversationRoom } from './entities/ai-conversation-room.entity'

const DEFAULT_VOICE = 'ja-JP-Wavenet-A'

const toRoom = (room: PrismaAIConversationRoom): AIConversationRoom => ({
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
})

@Injectable()
export class AIConversationRoomRepo {
  constructor(private readonly prismaService: PrismaService) {}

  async findMany(params: {
    currentPage: number
    pageSize: number
    userId: number
    isArchived?: boolean
  }) {
    const where: Prisma.AIConversationRoomWhereInput = {
      deletedAt: null,
      userId: params.userId,
      ...(params.isArchived !== undefined && { isArchived: params.isArchived })
    }
    const [items, total] = await Promise.all([
      this.prismaService.aIConversationRoom.findMany({
        where,
        ...toSkipTake(params.currentPage, params.pageSize),
        orderBy: { lastMessageAt: 'desc' }
      }),
      this.prismaService.aIConversationRoom.count({ where })
    ])
    return { items: items.map(toRoom), total }
  }

  // The user's room, not deleted
  async findOwned(id: string, userId: number): Promise<AIConversationRoom | null> {
    const room = await this.prismaService.aIConversationRoom.findFirst({
      where: { id, userId, deletedAt: null }
    })
    return room ? toRoom(room) : null
  }

  async findByConversationId(
    conversationId: string,
    userId?: number
  ): Promise<AIConversationRoom | null> {
    const room = await this.prismaService.aIConversationRoom.findFirst({
      where: { conversationId, deletedAt: null, ...(userId && { userId }) }
    })
    return room ? toRoom(room) : null
  }

  // Owner of a conversationId, deleted rooms included (it is unique)
  async findOwnerOfConversation(conversationId: string) {
    const room = await this.prismaService.aIConversationRoom.findUnique({
      where: { conversationId },
      select: { userId: true }
    })
    return room?.userId ?? null
  }

  async upsert(data: {
    userId: number
    conversationId: string
    title?: string | null
    voiceName?: string | null
  }): Promise<AIConversationRoom> {
    const room = await this.prismaService.aIConversationRoom.upsert({
      where: { conversationId: data.conversationId },
      create: {
        userId: data.userId,
        conversationId: data.conversationId,
        title: data.title || null,
        voiceName: data.voiceName || DEFAULT_VOICE
      },
      update: {
        title: data.title || undefined,
        voiceName:
          data.voiceName !== undefined ? data.voiceName || DEFAULT_VOICE : undefined
      }
    })
    return toRoom(room)
  }

  async update(
    where: { id: string } | { conversationId: string },
    data: UpdateAIConversationRoomData
  ): Promise<AIConversationRoom> {
    return toRoom(await this.prismaService.aIConversationRoom.update({ where, data }))
  }

  // Soft delete
  async delete(id: string): Promise<AIConversationRoom> {
    return toRoom(
      await this.prismaService.aIConversationRoom.update({
        where: { id },
        data: { deletedAt: new Date() }
      })
    )
  }
}
