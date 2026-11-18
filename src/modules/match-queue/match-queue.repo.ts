import { Injectable } from '@nestjs/common'

import { PrismaClient, QueueStatus } from '@prisma/client'
import { PrismaService } from 'src/shared/services/prisma.service'
import { CreateMatchQueueBodyType, MatchQueueType } from './entities/match-queue.entity'

@Injectable()
export class MatchQueueRepo {
  constructor(private prismaService: PrismaService) {}

  // The matchmaking run opens its transaction here (match, participants, queue rows)
  withTransaction<T>(callback: (prismaTx: PrismaClient) => Promise<T>): Promise<T> {
    return this.prismaService.$transaction(callback)
  }

  create({
    data
  }: {
    createdById: number | null
    data: CreateMatchQueueBodyType
  }): Promise<MatchQueueType> {
    return this.prismaService.matchQueue.create({
      data: {
        ...data
      }
    }) as unknown as Promise<MatchQueueType>
  }

  delete({ deletedById }: { deletedById: number }): Promise<MatchQueueType> {
    return this.prismaService.matchQueue.delete({
      where: {
        userId: deletedById
      }
    }) as unknown as Promise<MatchQueueType>
  }

  /**
   * Lấy danh sách users đang WAITING trong queue, sắp xếp theo createdAt
   */
  findWaitingUsers(): Promise<MatchQueueType[]> {
    return this.prismaService.matchQueue.findMany({
      where: {
        status: QueueStatus.WAITING,
        deletedAt: null
      },
      orderBy: {
        createdAt: 'asc' // Ưu tiên user vào hàng đợi trước
      }
    }) as unknown as Promise<MatchQueueType[]>
  }

  // ---- Matchmaking run (in its transaction) ----

  // A paired user leaves the queue
  removeQueuedUser(userId: number, prismaTx: PrismaClient) {
    return prismaTx.matchQueue.delete({ where: { userId } })
  }
}
