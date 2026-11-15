import { BullAction, BullQueue } from '@/common/constants/bull-action.constant'
import { UserSubscriptionStatus } from '@/common/constants/subscription.constant'
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
import { BadRequestException, forwardRef, Inject, Injectable } from '@nestjs/common'
import { Queue } from 'bull'
import { PaymentService } from '../payment/payment.service'
import { SubscriptionPlanNotFoundException } from '../subscription-plan/dto/subscription-plan.error'
import { SubscriptionPlanRepo } from '../subscription-plan/subscription-plan.repo'
import {
  UserHasSubscriptionWithStatusActiveException,
  UserHasSubscriptionWithStatusPendingPaymentException
} from '../user-subscription/dto/user-subscription.error'
import { UserSubscriptionRepo } from '../user-subscription/user-subscription.repo'
import { WalletTransactionRepo } from '../wallet-transaction/wallet-transaction.repo'
import { WalletRepo } from '../wallet/wallet.repo'
import { InvoiceNotFoundException } from './dto/invoice.error'
import { CreateInvoiceBodyType, UpdateInvoiceBodyType } from './entities/invoice.entity'
import { InvoiceRepo } from './invoice.repo'

@Injectable()
export class InvoiceService {
  constructor(
    private invoiceRepo: InvoiceRepo,
    private readonly subscriptionPlanRepo: SubscriptionPlanRepo,
    private readonly userSubRepo: UserSubscriptionRepo,
    private readonly i18nService: I18nService,
    @Inject(forwardRef(() => PaymentService))
    private readonly paymentService: PaymentService,
    @InjectQueue(BullQueue.INVOICE_EXPIRATION)
    private readonly invoiceExpirationQueue: Queue,
    private readonly walletRepo: WalletRepo,
    private readonly walletTransactionRepo: WalletTransactionRepo
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
  async create(
    { userId, data }: { userId: number; data: CreateInvoiceBodyType },
    lang: string = 'vi'
  ) {
    try {
      // check xem goi plan co active ko
      const isPlanExist = await this.subscriptionPlanRepo.getById(data.subscriptionPlanId)
      if (!isPlanExist) {
        throw new SubscriptionPlanNotFoundException()
      }
      if (isPlanExist.isActive === false) {
        throw new SubscriptionPlanNotFoundException()
      }
      console.log('isPlanExist')
      // xem user mua goi nay co dang active khong, neu co goi nay va dang active thi khong duoc mua nua
      const isUserActivePlanExist =
        await this.userSubRepo.findActiveByUserIdPlanIdAndStatus(
          userId,
          data.subscriptionPlanId,
          UserSubscriptionStatus.ACTIVE
        )
      if (isUserActivePlanExist) {
        throw new UserHasSubscriptionWithStatusActiveException()
      }
      console.log('isUserActivePlanExist')
      // xem user co dang thanh toan goi nay khong
      const isUserPayPlanExist = await this.userSubRepo.findActiveByUserIdPlanIdAndStatus(
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
      console.log('isUserPayPlanExist')
      const discountAmountInput = data.discountAmount || 0

      // Nếu có discount > 0, kiểm tra ví có đủ PokeCoin không
      if (discountAmountInput > 0) {
        const enough = await this.walletRepo.checkEnoughBalance({
          userId,
          type: walletType.POKE_COINS,
          amount: discountAmountInput
        })
        if (!enough) {
          throw new BadRequestException()
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
        await this.userSubRepo.create(
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
          const updatedWallet = await this.walletRepo.minusBalanceToWalletWithTypeUserId(
            { userId, type: walletType.POKE_COINS, amount: discountAmount },
            tx
          )
          if (!updatedWallet) {
            throw new BadRequestException()
          }

          const wtx = await this.walletTransactionRepo.create(
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
      console.log('xong create')
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
      console.log('bull')
      console.log('vao create payment')

      // Sau khi invoice đã commit vào DB, gọi createPayOSPayment
      const paymentResult = await this.paymentService.createPayOSPayment(
        {
          invoiceId: invoice.id
        },
        userId,
        lang
      )
      console.log('xong create - payment')
      return {
        statusCode: 201,
        data: {
          invoice,
          payment: paymentResult.data
        },
        message: this.i18nService.translate(InvoiceMessage.CREATE_SUCCESS, lang)
      }
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
}
