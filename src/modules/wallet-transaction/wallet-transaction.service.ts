import { NotFoundRecordException } from '@/shared/error'
import {
  isForeignKeyConstraintPrismaError,
  isNotFoundPrismaError,
  isUniqueConstraintPrismaError
} from '@/shared/helpers'
import { PaginationQuery } from '@/shared/models/request.model'
import { HttpStatus, Injectable } from '@nestjs/common'
import { WalletTransactionAlreadyExistsException } from './dto/wallet-transaction.error'
import {
  CreateWalletTransactionBody,
  UpdateWalletTransactionBody
} from './dto/wallet-transaction.zod-dto'
import { WalletTransactionRepo } from './wallet-transaction.repo'

@Injectable()
export class WalletTransactionService {
  constructor(private walletTransactionRepo: WalletTransactionRepo) {}

  async list(pagination: PaginationQuery) {
    const data = await this.walletTransactionRepo.list(pagination)
    return data
  }

  async findById(id: number) {
    const walletTransaction = await this.walletTransactionRepo.findById(id)
    if (!walletTransaction) {
      throw new NotFoundRecordException()
    }
    return walletTransaction
  }

  async create({
    data,
    createdById
  }: {
    data: CreateWalletTransactionBody
    createdById: number
  }) {
    try {
      const result = await this.walletTransactionRepo.create({
        createdById,
        data
      })
      return result
    } catch (error) {
      if (isUniqueConstraintPrismaError(error)) {
        throw new WalletTransactionAlreadyExistsException()
      }
      if (isNotFoundPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      if (isForeignKeyConstraintPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }

  async update({
    id,
    data,
    updatedById
  }: {
    id: number
    data: UpdateWalletTransactionBody
    updatedById: number
  }) {
    try {
      const walletTransaction = await this.walletTransactionRepo.update({
        id,
        updatedById,
        data
      })
      return walletTransaction
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      if (isForeignKeyConstraintPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      if (isUniqueConstraintPrismaError(error)) {
        throw new WalletTransactionAlreadyExistsException()
      }
      throw error
    }
  }

  async delete({ id, deletedById }: { id: number; deletedById: number }) {
    try {
      await this.walletTransactionRepo.delete({
        id,
        deletedById
      })
      return
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }

  // ---- For other modules (module-boundary plan B4) ----
  // Same arguments (a caller's transaction client included) and results as the
  // repo methods, so callers keep their transactions and write order.

  // Records one wallet movement (the repo's create)
  record(...args: Parameters<WalletTransactionRepo['create']>) {
    return this.walletTransactionRepo.create(...args)
  }
}
