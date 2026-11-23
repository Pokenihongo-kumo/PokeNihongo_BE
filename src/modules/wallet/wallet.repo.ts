import { PaginationQuery } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'

import { WalletTypeType } from '@/common/constants/wallet.constant'
import { parseQs } from '@/common/utils/qs-parser'
import { PrismaClient } from '@prisma/client'
import { PrismaService } from '@/shared/services/prisma.service'
import { CreateWalletBody, UpdateWalletBody } from './dto/wallet.zod-dto'
import { WALLET_FIELDS, Wallet } from './entities/wallet.entity'

@Injectable()
export class WalletRepo {
  constructor(private prismaService: PrismaService) {}

  async withTransaction<T>(callback: (prismaTx: PrismaClient) => Promise<T>): Promise<T> {
    return this.prismaService.$transaction(callback)
  }

  create(
    {
      createdById,
      data
    }: {
      createdById: number | null
      data: CreateWalletBody
    },
    prismaTx?: PrismaClient
  ): Promise<Wallet> {
    const client = prismaTx || this.prismaService
    return client.wallet.create({
      data: {
        ...data,
        createdById
      }
    })
  }

  update(
    {
      id,
      updatedById,
      data
    }: {
      id: number
      updatedById: number
      data: UpdateWalletBody
    },
    prismaTx?: PrismaClient
  ): Promise<Wallet> {
    const client = prismaTx || this.prismaService
    return client.wallet.update({
      where: {
        id,
        deletedAt: null
      },
      data: {
        ...data,
        updatedById
      }
    })
  }

  delete(
    {
      id,
      deletedById
    }: {
      id: number
      deletedById: number
    },
    isHard?: boolean,
    prismaTx?: PrismaClient
  ): Promise<Wallet> {
    const client = prismaTx || this.prismaService
    return isHard
      ? client.wallet.delete({
          where: {
            id
          }
        })
      : client.wallet.update({
          where: {
            id,
            deletedAt: null
          },
          data: {
            deletedAt: new Date(),
            deletedById
          }
        })
  }

  async list(pagination: PaginationQuery) {
    const { where, orderBy } = parseQs(pagination.qs, WALLET_FIELDS)

    const skip = (pagination.currentPage - 1) * pagination.pageSize
    const take = pagination.pageSize

    const [totalItems, data] = await Promise.all([
      this.prismaService.wallet.count({
        where: { deletedAt: null, ...where }
      }),
      this.prismaService.wallet.findMany({
        where: { deletedAt: null, ...where },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true
            }
          }
        },
        orderBy,
        skip,
        take
      })
    ])

    return {
      results: data,
      pagination: {
        current: pagination.currentPage,
        pageSize: pagination.pageSize,
        totalPage: Math.ceil(totalItems / pagination.pageSize),
        totalItem: totalItems
      }
    }
  }

  findById(id: number): Promise<Wallet | null> {
    return this.prismaService.wallet.findUnique({
      where: {
        id,
        deletedAt: null
      }
    })
  }

  findByUserIdAndType(userId: number, type: WalletTypeType): Promise<Wallet | null> {
    return this.prismaService.wallet.findFirst({
      where: {
        userId,
        type,
        deletedAt: null
      }
    })
  }

  findByUserId(userId: number): Promise<Wallet[] | null> {
    return this.prismaService.wallet.findMany({
      where: {
        userId,
        deletedAt: null
      }
    })
  }

  checkEnoughBalance({
    userId,
    type,
    amount
  }: {
    userId: number
    type: WalletTypeType
    amount: number
  }): Promise<Wallet | null> {
    return this.prismaService.wallet.findFirst({
      where: {
        userId,
        type,
        deletedAt: null,
        balance: {
          gte: amount
        }
      }
    })
  }
  async addBalanceToWalletWithType(
    {
      userId,
      type,
      amount
    }: {
      userId: number
      type: WalletTypeType
      amount: number
    },
    prismaTx?: PrismaClient
  ): Promise<Wallet | null> {
    const client = prismaTx || this.prismaService
    const wallet = await client.wallet.findFirst({
      where: {
        userId,
        type,
        deletedAt: null
      }
    })

    if (!wallet) return null

    return client.wallet.update({
      where: {
        id: wallet.id
      },
      data: {
        balance: {
          increment: amount
        }
      }
    })
  }

  // Debits only when the balance covers `amount`, in one conditional update:
  // concurrent debits wait for each other's row lock and re-check the balance.
  // null when there is no wallet or not enough balance (nothing changed); the
  // callers throw, which rolls their transaction back
  async minusBalanceToWalletWithTypeUserId(
    {
      userId,
      type,
      amount
    }: {
      userId: number
      type: WalletTypeType
      amount: number
    },
    prismaTx?: PrismaClient
  ): Promise<Wallet | null> {
    const client = prismaTx || this.prismaService
    const wallet = await client.wallet.findFirst({
      where: {
        userId,
        type,
        deletedAt: null
      }
    })

    if (!wallet) return null

    const { count } = await client.wallet.updateMany({
      where: { id: wallet.id, balance: { gte: amount } },
      data: { balance: { decrement: amount } }
    })
    if (count === 0) return null
    return client.wallet.findUnique({ where: { id: wallet.id } })
  }

  // Adds to the user's wallet of this type, creating it with that balance when
  // missing (a refund lands even if the wallet was never created)
  creditOrCreate(
    { userId, type, amount }: { userId: number; type: WalletTypeType; amount: number },
    prismaTx: PrismaClient
  ) {
    return prismaTx.wallet.upsert({
      where: { userId_type: { userId, type } },
      create: { userId, type, balance: amount },
      update: { balance: { increment: amount } }
    })
  }
}
