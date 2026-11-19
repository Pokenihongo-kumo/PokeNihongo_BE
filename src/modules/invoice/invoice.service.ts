import { BullAction, BullQueue } from '@/common/constants/bull-action.constant'
import {
  maxPokeCoinDiscount,
  UserSubscriptionStatus
} from '@/common/constants/subscription.constant'
import {
  walletPurposeType,
  WalletTransactionSourceType
} from '@/common/constants/wallet-transaction.constant'
import { walletType } from '@/common/constants/wallet.constant'
import { I18nService } from '@/i18n/i18n.service'
import { InvoiceMessage } from '@/i18n/message-keys'
import { SubscriptionPlanService } from '@/modules/subscription-plan/subscription-plan.service'
import { UserSubscriptionService } from '@/modules/user-subscription/user-subscription.service'
import { WalletService } from '@/modules/wallet/wallet.service'
import { NotFoundRecordException } from '@/shared/error'
import {
  isForeignKeyConstraintPrismaError,
  isNotFoundPrismaError
} from '@/shared/helpers'
import { PaginationQuery } from '@/shared/models/request.model'
import { InjectQueue } from '@nestjs/bull'
import { Injectable } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { Queue } from 'bull'
import { SubscriptionPlanNotFoundException } from '../subscription-plan/dto/subscription-plan.error'
import {
  UserHasSubscriptionWithStatusActiveException,
  UserHasSubscriptionWithStatusPendingPaymentException
} from '../user-subscription/dto/user-subscription.error'
import {
  InvoiceDiscountTooHighException,
  InvoiceNotEnoughPokeCoinsException,
  InvoiceNotFoundException
} from './dto/invoice.error'
import { CreateInvoiceBody, UpdateInvoiceBody } from './dto/invoice.zod-dto'
import { InvoiceRepo } from './invoice.repo'

@Injectable()
export class InvoiceService {
  constructor(
    private invoiceRepo: InvoiceRepo,
    private readonly subscriptionPlanService: SubscriptionPlanService,
    private readonly userSubscriptionService: UserSubscriptionService,
    private readonly i18nService: I18nService,
    @InjectQueue(BullQueue.INVOICE_EXPIRATION)
    private readonly invoiceExpirationQueue: Queue,
    private readonly walletService: WalletService
  ) {}

  async list(pagination: PaginationQuery, lang: string = 'vi') {
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
  async createPending({ userId, data }: { userId: number; data: CreateInvoiceBody }) {
    try {
      // check xem goi plan co active ko
      const isPlanExist = await this.subscriptionPlanService.getById(
        data.subscriptionPlanId
      )
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
          const debited = await this.walletService.debit(
            {
              userId,
              type: walletType.POKE_COINS,
              amount: discountAmount,
              createdById: userId,
              purpose: walletPurposeType.SUBSCRIPTION,
              referenceId: createdInvoice.id,
              source: WalletTransactionSourceType.SUBSCRIPTION_DISCOUNT
            },
            tx
          )
          if (!debited) {
            throw new InvoiceNotEnoughPokeCoinsException()
          }

          await this.invoiceRepo.updateWalletTransaction(
            createdInvoice.id,
            debited.transaction.id,
            tx
          )
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
      data: UpdateInvoiceBody
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

  // ---- Cancelling a pending invoice (ADR D1 §3) ----

  /**
   * Cancels an invoice that is still PENDING, inside the caller's transaction.
   * Shared by the expiration job and the PayOS cancel callback. Only the call
   * that moves the invoice PENDING -> CANCELLED goes on: its subscription
   * PENDING_PAYMENT -> PAYMENT_FAILED and the PokeCoin discount is given back.
   * A paid invoice, or one another call already cancelled, is left alone, so
   * the coins come back exactly once.
   */
  async cancelPending(
    invoiceId: number,
    prismaTx: PrismaClient
  ): Promise<{ cancelled: boolean; refunded: number }> {
    const { count } = await this.invoiceRepo.cancelIfPending(invoiceId, prismaTx)
    if (count === 0) return { cancelled: false, refunded: 0 }

    await this.userSubscriptionService.failPendingPayment(invoiceId, prismaTx)

    const invoice = await this.invoiceRepo.getByIdOrThrow(invoiceId, prismaTx)
    if (invoice.discountAmount <= 0) return { cancelled: true, refunded: 0 }

    // The coins were taken from this wallet when the invoice was created
    await this.walletService.credit(
      {
        userId: invoice.userId,
        type: walletType.POKE_COINS,
        amount: invoice.discountAmount,
        createdById: invoice.userId,
        purpose: walletPurposeType.REFUND,
        referenceId: invoice.id,
        source: WalletTransactionSourceType.ADMIN_ADJUST
      },
      prismaTx,
      { createIfMissing: true }
    )
    return { cancelled: true, refunded: invoice.discountAmount }
  }

  // The expiration job: cancelPending in its own transaction
  expirePending(invoiceId: number) {
    return this.invoiceRepo.withTransaction((tx) => this.cancelPending(invoiceId, tx))
  }
}
