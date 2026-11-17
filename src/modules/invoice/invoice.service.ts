import { BullAction, BullQueue } from '@/common/constants/bull-action.constant'
import {
  maxPokeCoinDiscount,
  UserSubscriptionStatus
} from '@/common/constants/subscription.constant'
import {
  walletPurposeType,
  WalletTransactionSourceType,
  WalletTransactionType
} from '@/common/constants/wallet-transaction.constant'
import { walletType } from '@/common/constants/wallet.constant'
import { I18nService } from '@/i18n/i18n.service'
import { InvoiceMessage } from '@/i18n/message-keys'
import { NotFoundRecordException } from '@/shared/error'
import {
  isForeignKeyConstraintPrismaError,
  isNotFoundPrismaError
} from '@/shared/helpers'
import { PaginationQueryType } from '@/shared/models/request.model'
import { InjectQueue } from '@nestjs/bull'
import { Injectable } from '@nestjs/common'
import { Queue } from 'bull'
import { SubscriptionPlanNotFoundException } from '../subscription-plan/dto/subscription-plan.error'
import { SubscriptionPlanRepo } from '../subscription-plan/subscription-plan.repo'
import {
  UserHasSubscriptionWithStatusActiveException,
  UserHasSubscriptionWithStatusPendingPaymentException
} from '../user-subscription/dto/user-subscription.error'
import { UserSubscriptionService } from '@/modules/user-subscription/user-subscription.service'
import { WalletTransactionService } from '@/modules/wallet-transaction/wallet-transaction.service'
import { WalletService } from '@/modules/wallet/wallet.service'
import {
  InvoiceDiscountTooHighException,
  InvoiceNotEnoughPokeCoinsException,
  InvoiceNotFoundException
} from './dto/invoice.error'
import { CreateInvoiceBodyType, UpdateInvoiceBodyType } from './entities/invoice.entity'
import { InvoiceRepo } from './invoice.repo'

@Injectable()
export class InvoiceService {
  constructor(
    private invoiceRepo: InvoiceRepo,
    private readonly subscriptionPlanRepo: SubscriptionPlanRepo,
    private readonly userSubscriptionService: UserSubscriptionService,
    private readonly i18nService: I18nService,
    @InjectQueue(BullQueue.INVOICE_EXPIRATION)
    private readonly invoiceExpirationQueue: Queue,
    private readonly walletService: WalletService,
    private readonly walletTransactionService: WalletTransactionService
  ) {}

  async list(pagination: PaginationQueryType, lang: string = 'vi') {
    const data = await this.invoiceRepo.list(pagination)
    return {
      statusCode: 200,
      data,
      message: this.i18nService.translate(InvoiceMessage.GET_LIST_SUCCESS, lang)
    }
  }

  // Helper method to calculate weaknesses for a Pokemon (copied from PokemonService)
  async findById(id: number, lang: string = 'vi') {
    const invoice = await this.invoiceRepo.findById(id)
    if (!invoice) {
      throw new InvoiceNotFoundException()
    }

    return {
      statusCode: 200,
      data: invoice,
      message: this.i18nService.translate(InvoiceMessage.GET_LIST_SUCCESS, lang)
    }
  }
  // A pending invoice (with its PENDING_PAYMENT subscription and the PokeCoin
  // discount taken), committed before any payment link exists. POST /invoice
  // lives in the payment module, which opens the link next (B5: invoice no
  // longer calls payment).
  async createPending({ userId, data }: { userId: number; data: CreateInvoiceBodyType }) {
    try {
      // check xem goi plan co active ko
      const isPlanExist = await this.subscriptionPlanRepo.getById(data.subscriptionPlanId)
      if (!isPlanExist) {
        throw new SubscriptionPlanNotFoundException()
      }
      if (isPlanExist.isActive === false) {
        throw new SubscriptionPlanNotFoundException()
      }
      // PokeCoin pays at most half the price (any amount, even more than the
      // price, used to be taken: a free or negative-total plan)
      if ((data.discountAmount || 0) > maxPokeCoinDiscount(isPlanExist.price)) {
        throw new InvoiceDiscountTooHighException()
      }
      // xem user mua goi nay co dang active khong, neu co goi nay va dang active thi khong duoc mua nua
      const isUserActivePlanExist =
        await this.userSubscriptionService.findActiveByUserIdPlanIdAndStatus(
          userId,
          data.subscriptionPlanId,
          UserSubscriptionStatus.ACTIVE
        )
      if (isUserActivePlanExist) {
        throw new UserHasSubscriptionWithStatusActiveException()
      }
      // xem user co dang thanh toan goi nay khong
      const isUserPayPlanExist =
        await this.userSubscriptionService.findActiveByUserIdPlanIdAndStatus(
          userId,
          data.subscriptionPlanId,
          UserSubscriptionStatus.PENDING_PAYMENT
        )
      if (isUserPayPlanExist) {
        throw new UserHasSubscriptionWithStatusPendingPaymentException(
          `Invoice ID: ${isUserPayPlanExist.invoiceId}`,
          { invoiceId: isUserPayPlanExist.invoiceId }
        )
      }
      const discountAmountInput = data.discountAmount || 0

      // Nếu có discount > 0, kiểm tra ví có đủ PokeCoin không
      if (discountAmountInput > 0) {
        const enough = await this.walletService.checkEnoughBalance({
          userId,
          type: walletType.POKE_COINS,
          amount: discountAmountInput
        })
        if (!enough) {
          throw new InvoiceNotEnoughPokeCoinsException()
        }
      }

      // Tạo invoice + user-subscription trong transaction
      const invoice = await this.invoiceRepo.withTransaction(async (tx) => {
        // chuan bi them data co create invoice
        const subtotalAmount = isPlanExist.price
        const discountAmount = discountAmountInput
        const totalAmount = subtotalAmount - discountAmount

        const createdInvoice = await this.invoiceRepo.create(
          {
            createdById: userId,
            data: {
              ...data,
              subtotalAmount,
              discountAmount,
              totalAmount,
              userId
            }
          },
          tx
        )

        // Tạo UserSubscription ở trạng thái PENDING_PAYMENT, gắn với invoice vừa tạo
        await this.userSubscriptionService.createUserSubscription(
          {
            createdById: userId,
            data: {
              subscriptionPlanId: isPlanExist.id,
              invoiceId: createdInvoice.id,
              userId
            }
          },
          tx
        )

        // Nếu có discount > 0: trừ coin và tạo wallet transaction, cập nhật invoice.walletTransactionId
        if (discountAmount > 0) {
          const updatedWallet =
            await this.walletService.minusBalanceToWalletWithTypeUserId(
              { userId, type: walletType.POKE_COINS, amount: discountAmount },
              tx
            )
          if (!updatedWallet) {
            throw new InvoiceNotEnoughPokeCoinsException()
          }

          const wtx = await this.walletTransactionService.record(
            {
              createdById: userId,
              data: {
                walletId: updatedWallet.id,
                userId,
                purpose: walletPurposeType.SUBSCRIPTION,
                referenceId: createdInvoice.id,
                amount: discountAmount,
                type: WalletTransactionType.DECREASE,
                source: WalletTransactionSourceType.SUBSCRIPTION_DISCOUNT,
                description: null
              }
            },
            tx
          )

          await this.invoiceRepo.updateWalletTransaction(createdInvoice.id, wtx.id, tx)
        }

        return createdInvoice
      })
      // Schedule auto cancellation after 60 minutes if still PENDING
      await this.invoiceExpirationQueue.add(
        BullAction.EXPIRE_INVOICE,
        { invoiceId: invoice.id },
        {
          delay: 60 * 60 * 1000,
          jobId: `invoice-expire-${invoice.id}`,
          removeOnComplete: true,
          removeOnFail: true
        }
      )

      return invoice
    } catch (error) {
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
      userId
    }: {
      id: number
      data: UpdateInvoiceBodyType
      userId?: number
    },
    lang: string = 'vi'
  ) {
    try {
      // Update invoice trong transaction
      const invoice = await this.invoiceRepo.withTransaction(async (tx) => {
        return await this.invoiceRepo.update(
          {
            id,
            data: data,
            updatedById: userId
          },
          tx
        )
      })

      return {
        statusCode: 200,
        data: invoice,
        message: this.i18nService.translate(InvoiceMessage.UPDATE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new InvoiceNotFoundException()
      }

      if (isForeignKeyConstraintPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }

  async delete({ id, userId }: { id: number; userId?: number }, lang: string = 'vi') {
    try {
      const existInvoice = await this.invoiceRepo.findById(id)
      if (!existInvoice) {
        throw new InvoiceNotFoundException()
      }

      await this.invoiceRepo.delete(id)
      return {
        statusCode: 200,
        data: null,
        message: this.i18nService.translate(InvoiceMessage.DELETE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new InvoiceNotFoundException()
      }
      throw error
    }
  }

  // The invoice was paid: its expiration job has nothing left to do
  async removeExpirationJob(invoiceId: number) {
    const job = await this.invoiceExpirationQueue.getJob(`invoice-expire-${invoiceId}`)
    if (job) await job.remove()
  }

  // ---- For other modules (module-boundary plan B4) ----
  // Same arguments (a caller's transaction client included) and results as the
  // repo methods, so callers keep their transactions and write order.

  // The invoice row or null (the service's findById answers the HTTP route)
  getById(...args: Parameters<InvoiceRepo['findById']>) {
    return this.invoiceRepo.findById(...args)
  }

  findActiveByUserIdPlanIdAndStatus(
    ...args: Parameters<InvoiceRepo['findActiveByUserIdPlanIdAndStatus']>
  ) {
    return this.invoiceRepo.findActiveByUserIdPlanIdAndStatus(...args)
  }
}
