import {
  FeatureKeyType,
  UserSubscriptionStatus
} from '@/common/constants/subscription.constant'
import { I18nService } from '@/i18n/i18n.service'
import { UserSubscriptionMessage } from '@/i18n/message-keys'
import { NotFoundRecordException } from '@/shared/error'
import {
  isForeignKeyConstraintPrismaError,
  isNotFoundPrismaError
} from '@/shared/helpers'
import { PaginationQueryType } from '@/shared/models/request.model'
import { PrismaService } from '@/shared/services/prisma.service'
import { Injectable } from '@nestjs/common'
import { LanguagesRepo } from '../languages/languages.repo'
import { SubscriptionPlanNotFoundException } from '../subscription-plan/dto/subscription-plan.error'
import { SubscriptionPlanRepo } from '../subscription-plan/subscription-plan.repo'
import {
  UserHasSubscriptionWithStatusActiveException,
  UserHasSubscriptionWithStatusPendingPaymentException,
  UserSubscriptionNotFoundException
} from './dto/user-subscription.error'
import {
  CreateUserSubscriptionBodyType,
  UpdateUserSubscriptionBodyType
} from './entities/user-subscription.entity'
import { UserSubscriptionRepo } from './user-subscription.repo'

@Injectable()
export class UserSubscriptionService {
  constructor(
    private userSubscriptionRepo: UserSubscriptionRepo,
    private readonly subscriptionPlanRepo: SubscriptionPlanRepo,
    private readonly i18nService: I18nService,
    private readonly languageRepo: LanguagesRepo,
    private readonly prismaService: PrismaService
  ) {}

  private async convertTranslationsToLangCodes(
    translations: Array<{ languageId: number; value: string }>
  ): Promise<Array<{ key: string; value: string }>> {
    if (!translations || translations.length === 0) return []

    const allLangIds = Array.from(new Set(translations.map((t) => t.languageId)))
    const langs = await this.languageRepo.getWithListId(allLangIds)
    const idToCode = new Map(langs.map((l) => [l.id, l.code]))

    return translations.map((t) => ({
      key: idToCode.get(t.languageId) || String(t.languageId),
      value: t.value
    }))
  }

  async list(pagination: PaginationQueryType, lang: string = 'vi') {
    const data = await this.userSubscriptionRepo.list(pagination)
    return {
      statusCode: 200,
      data,
      message: this.i18nService.translate(UserSubscriptionMessage.GET_LIST_SUCCESS, lang)
    }
  }

  // Helper method to calculate weaknesses for a Pokemon (copied from PokemonService)
  async findById(id: number, lang: string = 'vi') {
    const userSubscription = await this.userSubscriptionRepo.findById(id)
    if (!userSubscription) {
      throw new UserSubscriptionNotFoundException()
    }

    return {
      statusCode: 200,
      data: userSubscription,
      message: this.i18nService.translate(UserSubscriptionMessage.GET_LIST_SUCCESS, lang)
    }
  }
  async create(
    { userId, data }: { userId: number; data: CreateUserSubscriptionBodyType },
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

      // xem user mua goi nay co dang active khong, neu co goi nay va dang active thi khong duoc mua nua
      const isUserActivePlanExist =
        await this.userSubscriptionRepo.findActiveByUserIdPlanIdAndStatus(
          userId,
          data.subscriptionPlanId,
          UserSubscriptionStatus.ACTIVE
        )
      if (isUserActivePlanExist) {
        throw new UserHasSubscriptionWithStatusActiveException()
      }
      // xem user co dang thanh toan goi nay khong
      const isUserPayPlanExist =
        await this.userSubscriptionRepo.findActiveByUserIdPlanIdAndStatus(
          userId,
          data.subscriptionPlanId,
          UserSubscriptionStatus.PENDING_PAYMENT
        )
      if (isUserPayPlanExist) {
        throw new UserHasSubscriptionWithStatusPendingPaymentException()
      }

      const result = await this.userSubscriptionRepo.create({
        createdById: userId,
        data: {
          ...data,
          userId
        }
      })
      return {
        statusCode: 201,
        data: result,
        message: this.i18nService.translate(UserSubscriptionMessage.CREATE_SUCCESS, lang)
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
      data: UpdateUserSubscriptionBodyType
      userId?: number
    },
    lang: string = 'vi'
  ) {
    try {
      const userSubscription = await this.userSubscriptionRepo.update({
        id,
        data: data,
        updatedById: userId
      })
      return {
        statusCode: 200,
        data: userSubscription,
        message: this.i18nService.translate(UserSubscriptionMessage.UPDATE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new UserSubscriptionNotFoundException()
      }

      if (isForeignKeyConstraintPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }

  async delete({ id, userId }: { id: number; userId?: number }, lang: string = 'vi') {
    try {
      const existUserSubscription = await this.userSubscriptionRepo.findById(id)
      if (!existUserSubscription) {
        throw new UserSubscriptionNotFoundException()
      }

      await this.userSubscriptionRepo.delete(id)
      return {
        statusCode: 200,
        data: null,
        message: this.i18nService.translate(UserSubscriptionMessage.DELETE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new UserSubscriptionNotFoundException()
      }
      throw error
    }
  }

  async getUserSubWithSubPlan(
    pagination: PaginationQueryType,
    userId: number,
    lang: string = 'vi'
  ) {
    const langId = await this.languageRepo.getIdByCode(lang)
    const data = await this.userSubscriptionRepo.getUserSubWithSubPlan(
      pagination,
      userId,
      langId ?? undefined
    )
    // lượt bỏ nameTranslations, descriptionTranslations
    const results = data.results.map((us: any) => {
      const plan = us.subscriptionPlan
      if (!plan || !plan.subscription) return us
      const sub = plan.subscription
      const { nameTranslations, descriptionTranslations, ...subRest } = sub

      return {
        ...us,
        subscriptionPlan: {
          ...plan,
          subscription: {
            ...subRest
          }
        }
      }
    })
    return {
      statusCode: 200,
      data: {
        ...data,
        results
      },
      message: this.i18nService.translate(UserSubscriptionMessage.GET_LIST_SUCCESS, lang)
    }
  }

  async getValueConvertByfeatureKeyAndUserId(featureKey: FeatureKeyType, userId: number) {
    const userSubs = await this.userSubscriptionRepo.findActiveByUserIdWithfeatureKey(
      userId,
      featureKey
    )

    if (!userSubs || userSubs.length === 0) {
      return 1
    }

    // Collect all feature values from all active subscriptions
    const values: number[] = []
    for (const us of userSubs) {
      const plan = (us as any).subscriptionPlan
      if (!plan || !plan.subscription || !plan.subscription.features) continue
      for (const sf of plan.subscription.features) {
        if (sf.value) {
          const parsed = parseFloat(sf.value)
          if (!isNaN(parsed)) {
            values.push(parsed)
          }
        }
      }
    }

    if (values.length === 0) {
      return 1
    }

    // Compute average
    const sum = values.reduce((acc, v) => acc + v, 0)
    return sum / values.length
  }

  async getHasByfeatureKeyAndUserId(featureKey: FeatureKeyType, userId: number) {
    const userSubs = await this.userSubscriptionRepo.findActiveByUserIdWithfeatureKey(
      userId,
      featureKey
    )

    if (!userSubs || userSubs.length === 0) {
      return false
    }

    // Check if any subscription has this feature
    for (const us of userSubs) {
      const plan = (us as any).subscriptionPlan
      if (!plan || !plan.subscription || !plan.subscription.features) continue
      if (plan.subscription.features.length > 0) {
        return true
      }
    }

    return false
  }

  async getInforSubAndInvoiceWithUserSubId(invoiceOd: number, lang: string = 'vi') {
    const us = await this.userSubscriptionRepo.findDetailByInvoiceId(invoiceOd)
    if (!us) {
      throw new UserSubscriptionNotFoundException()
    }

    const invoice = us.invoice
    const paymentPaid = invoice?.payments?.find((p: any) => p.status === 'PAID')
    const paymentAny = invoice?.payments?.[0]
    const paymentMethod = paymentPaid?.paymentMethod || paymentAny?.paymentMethod || null

    // Lấy tên gói (dịch theo lang nếu có)
    let planName: string | null = null
    let planDescription: string | null = null
    if ((us as any).subscriptionPlan && (us as any).subscriptionPlan.subscription) {
      const sub = (us as any).subscriptionPlan.subscription
      const langId = await this.languageRepo.getIdByCode(lang)
      if (langId && sub.nameTranslations) {
        const match = sub.nameTranslations.find((t: any) => t.languageId === langId)
        planName = match?.value || sub.nameKey
      } else {
        planName = sub.nameKey
      }
      if (langId && sub.descriptionTranslations) {
        const matchDesc = sub.descriptionTranslations.find(
          (t: any) => t.languageId === langId
        )
        planDescription = matchDesc?.value || sub.descriptionKey
      } else {
        planDescription = sub.descriptionKey
      }
    }

    return {
      statusCode: 200,
      data: {
        userSubscriptionId: us.id,
        startDate: us.startDate,
        expiresAt: us.expiresAt,
        status: us.status,
        subtotalAmount: invoice?.subtotalAmount ?? null,
        discountAmount: invoice?.discountAmount ?? null,
        totalAmount: invoice?.totalAmount ?? null,
        paymentMethod,
        planName,
        planDescription,
        user: us.user
      },
      message: this.i18nService.translate(UserSubscriptionMessage.GET_SUCCESS, lang)
    }
  }

  async getListFeatureOfUser(userId: number, lang: string = 'vi') {
    // Lấy tất cả subscription đang active của user
    const result = await this.userSubscriptionRepo.getListFeatureOfUser(userId)

    return {
      statusCode: 200,
      data: {
        result
      },
      message: this.i18nService.translate(UserSubscriptionMessage.GET_LIST_SUCCESS, lang)
    }
  }

  async findByUserAndInvoice(userId: number, invoiceId: number) {
    const userSubscription = await this.userSubscriptionRepo.findByUserAndInvoice(
      userId,
      invoiceId
    )
    return userSubscription
  }
}
