import { I18nService } from '@/i18n/i18n.service'
import { WalletTransactionMessage } from '@/i18n/message-keys'
import { NotFoundRecordException } from '@/shared/error'
import {
  isForeignKeyConstraintPrismaError,
  isNotFoundPrismaError,
  isUniqueConstraintPrismaError
} from '@/shared/helpers'
import { PaginationQueryType } from '@/shared/models/request.model'
import { HttpStatus, Injectable } from '@nestjs/common'
import { WalletTransactionAlreadyExistsException } from './dto/wallet-transaction.error'
import {
  CreateWalletTransactionBodyType,
  UpdateWalletTransactionBodyType
} from './entities/wallet-transaction.entity'
import { WalletTransactionRepo } from './wallet-transaction.repo'

@Injectable()
export class WalletTransactionService {
  constructor(
    private walletTransactionRepo: WalletTransactionRepo,
    private readonly i18nService: I18nService
  ) {}

  async list(pagination: PaginationQueryType, lang: string = 'vi') {
    const data = await this.walletTransactionRepo.list(pagination)
    return {
      data,
      message: this.i18nService.translate(WalletTransactionMessage.GET_LIST_SUCCESS, lang)
    }
  }

  async findById(id: number, lang: string = 'vi') {
    const walletTransaction = await this.walletTransactionRepo.findById(id)
    if (!walletTransaction) {
      throw new NotFoundRecordException()
    }
    return {
      data: walletTransaction,
      message: this.i18nService.translate(WalletTransactionMessage.GET_SUCCESS, lang)
    }
  }

  async create(
    {
      data,
      createdById
    }: {
      data: CreateWalletTransactionBodyType
      createdById: number
    },
    lang: string = 'vi'
  ) {
    try {
      const result = await this.walletTransactionRepo.create({
        createdById,
        data
      })
      return {
        statusCode: HttpStatus.CREATED,
        data: result,
        message: this.i18nService.translate(WalletTransactionMessage.CREATE_SUCCESS, lang)
      }
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

  async update(
    {
      id,
      data,
      updatedById
    }: {
      id: number
      data: UpdateWalletTransactionBodyType
      updatedById: number
    },
    lang: string = 'vi'
  ) {
    try {
      const walletTransaction = await this.walletTransactionRepo.update({
        id,
        updatedById,
        data
      })
      return {
        statusCode: HttpStatus.OK,
        data: walletTransaction,
        message: this.i18nService.translate(WalletTransactionMessage.UPDATE_SUCCESS, lang)
      }
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

  async delete(
    { id, deletedById }: { id: number; deletedById: number },
    lang: string = 'vi'
  ) {
    try {
      await this.walletTransactionRepo.delete({
        id,
        deletedById
      })
      return {
        statusCode: HttpStatus.OK,
        data: null,
        message: this.i18nService.translate(WalletTransactionMessage.DELETE_SUCCESS, lang)
      }
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
