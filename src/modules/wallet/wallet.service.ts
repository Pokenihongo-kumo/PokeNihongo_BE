import { walletType } from '@/common/constants/wallet.constant'
import { I18nService } from '@/i18n/i18n.service'
import { WalletMessage } from '@/i18n/message-keys'
import { UserRepo } from '@/modules/user/user.repo'
import { NotFoundRecordException } from '@/shared/error'
import {
  isForeignKeyConstraintPrismaError,
  isNotFoundPrismaError,
  isUniqueConstraintPrismaError
} from '@/shared/helpers'
import { PaginationQueryType } from '@/shared/models/request.model'
import { HttpStatus, Injectable, Logger } from '@nestjs/common'
import { WalletAlreadyExistsException } from './dto/wallet.error'
import { CreateWalletBodyType, UpdateWalletBodyType } from './entities/wallet.entity'
import { WalletRepo } from './wallet.repo'

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name)
  constructor(
    private walletRepo: WalletRepo,
    private readonly i18nService: I18nService,
    private readonly userRepo: UserRepo
  ) {}

  // Generate wallets for all users (create missing wallet types per user)
  async generateWalletForAllUsers(
    { createdById }: { createdById: number },
    lang: string = 'vi'
  ) {
    // We'll paginate through users to avoid loading all users into memory
    const pageSize = 1000
    let currentPage = 1

    while (true) {
      const usersPage = await this.userRepo.list({
        currentPage,
        pageSize,
        qs: ''
      })

      for (const user of usersPage.results) {
        // Reuse existing helper to ensure both wallets
        // generateWalletByUserId is idempotent
        try {
          await this.generateWalletByUserId(user.id)
        } catch (err) {
          // ignore per-user errors so the batch continues; collect/logging could be added
          continue
        }
      }

      if (currentPage >= usersPage.pagination.totalPage) break
      currentPage++
    }

    return {
      statusCode: HttpStatus.OK,
      data: null,
      message: this.i18nService.translate(WalletMessage.CREATE_SUCCESS, lang)
    }
  }

  async list(pagination: PaginationQueryType, lang: string = 'vi') {
    const data = await this.walletRepo.list(pagination)
    return {
      data,
      message: this.i18nService.translate(WalletMessage.GET_LIST_SUCCESS, lang)
    }
  }

  async findById(id: number, lang: string = 'vi') {
    const wallet = await this.walletRepo.findById(id)
    if (!wallet) {
      throw new NotFoundRecordException()
    }
    return {
      data: wallet,
      message: this.i18nService.translate(WalletMessage.GET_SUCCESS, lang)
    }
  }

  async create(
    {
      data,
      createdById
    }: {
      data: CreateWalletBodyType
      createdById: number
    },
    lang: string = 'vi'
  ) {
    try {
      const result = await this.walletRepo.create({
        createdById,
        data
      })
      return {
        statusCode: HttpStatus.CREATED,
        data: result,
        message: this.i18nService.translate(WalletMessage.CREATE_SUCCESS, lang)
      }
    } catch (error) {
      if (isUniqueConstraintPrismaError(error)) {
        throw new WalletAlreadyExistsException()
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
      data: UpdateWalletBodyType
      updatedById: number
    },
    lang: string = 'vi'
  ) {
    try {
      const wallet = await this.walletRepo.update({
        id,
        updatedById,
        data
      })
      return {
        statusCode: HttpStatus.OK,
        data: wallet,
        message: this.i18nService.translate(WalletMessage.UPDATE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      if (isForeignKeyConstraintPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      if (isUniqueConstraintPrismaError(error)) {
        throw new WalletAlreadyExistsException()
      }
      throw error
    }
  }

  async delete(
    { id, deletedById }: { id: number; deletedById: number },
    lang: string = 'vi'
  ) {
    try {
      await this.walletRepo.delete({
        id,
        deletedById
      })
      return {
        statusCode: HttpStatus.OK,
        data: null,
        message: this.i18nService.translate(WalletMessage.DELETE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }

  async generateWalletByUserId(userId: number) {
    const types = [walletType.POKE_COINS, walletType.SPARKLES]

    for (const type of types) {
      try {
        // Use dedicated repo method to check existence
        const existing = await this.walletRepo.findByUserIdAndType(userId, type as any)

        if (existing) continue

        await this.walletRepo.create({
          createdById: userId,
          data: {
            userId,
            type: type as any,
            balance: 0
          }
        })
      } catch (error) {
        // If another process created the wallet concurrently, ignore unique constraint error
        if (isUniqueConstraintPrismaError(error)) {
          continue
        }
        this.logger.error(
          `Wallet ${type} of user ${userId} not created`,
          error instanceof Error ? error.name : 'error'
        )
        throw error
      }
    }
  }

  async getWalletsByUser(userId: number, lang: string = 'vi') {
    const wallets = await this.walletRepo.findByUserId(userId)

    return {
      statusCode: HttpStatus.OK,
      data: wallets,
      message: this.i18nService.translate(WalletMessage.GET_LIST_SUCCESS, lang)
    }
  }
}
