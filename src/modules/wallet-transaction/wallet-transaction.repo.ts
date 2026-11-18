import { PaginationQuery } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'

import { WalletTransactionTypeType } from '@/common/constants/wallet-transaction.constant'
import { parseQs } from '@/common/utils/qs-parser'
import { PrismaClient } from '@prisma/client'
import { PrismaService } from 'src/shared/services/prisma.service'
import {
  CreateWalletTransactionBody,
  UpdateWalletTransactionBody,
  WALLET_TRANSACTION_FIELDS,
  WalletTransaction
} from './entities/wallet-transaction.entity'

@Injectable()
export class WalletTransactionRepo {
  constructor(private prismaService: PrismaService) {}
  async withTransaction<T>(callback: (prismaTx: PrismaClient) => Promise<T>): Promise<T> {
    return this.prismaService.$transaction(callback)
  }
  create(
    {
      createdById,
      data
    }: {
      createdById?: number | null
      data: CreateWalletTransactionBody
    },
    prismaTx?: PrismaClient
  ): Promise<WalletTransaction> {
    const client = prismaTx || this.prismaService
    return client.walletTransaction.create({
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
      data: UpdateWalletTransactionBody
    },
    prismaTx?: PrismaClient
  ): Promise<WalletTransaction> {
    const client = prismaTx || this.prismaService
    return client.walletTransaction.update({
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
  ): Promise<WalletTransaction> {
    const client = prismaTx || this.prismaService
    return isHard
      ? client.walletTransaction.delete({
          where: {
            id
          }
        })
      : client.walletTransaction.update({
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
    const { where, orderBy } = parseQs(pagination.qs, WALLET_TRANSACTION_FIELDS)

    const skip = (pagination.currentPage - 1) * pagination.pageSize
    const take = pagination.pageSize

    const [totalItems, data] = await Promise.all([
      this.prismaService.walletTransaction.count({
        where: { deletedAt: null, ...where }
      }),
      this.prismaService.walletTransaction.findMany({
        where: { deletedAt: null, ...where },
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

  findById(id: number): Promise<WalletTransaction | null> {
    return this.prismaService.walletTransaction.findUnique({
      where: {
        id,
        deletedAt: null
      }
    })
  }

  findByUserIdAndType(
    userId: number,
    type: WalletTransactionTypeType
  ): Promise<WalletTransaction | null> {
    return this.prismaService.walletTransaction.findFirst({
      where: {
        userId,
        type,
        deletedAt: null
      }
    })
  }

  findByUserId(userId: number): Promise<WalletTransaction[] | null> {
    return this.prismaService.walletTransaction.findMany({
      where: {
        userId,
        deletedAt: null
      }
    })
  }
}
