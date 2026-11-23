import { RoleName } from '@/common/constants/role.constant'
import { maxPokeCoinDiscount } from '@/common/constants/subscription.constant'
import { walletType } from '@/common/constants/wallet.constant'
import { LanguagesService } from '@/modules/languages/languages.service'
import { WalletService } from '@/modules/wallet/wallet.service'
import { NotFoundRecordException } from '@/shared/error'
import {
  isForeignKeyConstraintPrismaError,
  isNotFoundPrismaError
} from '@/shared/helpers'
import { PaginationQuery } from '@/shared/models/request.model'
import { Injectable, Logger } from '@nestjs/common'
import { SubscriptionPlanNotFoundException } from './dto/subscription-plan.error'
import {
  CreateSubscriptionPlanBody,
  UpdateSubscriptionPlanBody
} from './dto/subscription-plan.zod-dto'
import { SubscriptionPlanRepo } from './subscription-plan.repo'

@Injectable()
export class SubscriptionPlanService {
  private readonly logger = new Logger(SubscriptionPlanService.name)

  constructor(
    private subscriptionPlanRepo: SubscriptionPlanRepo,
    private readonly languagesService: LanguagesService,
    private readonly walletService: WalletService
  ) {}

  private async convertTranslationsToLangCodes(
    translations: Array<{ languageId: number; value: string }>
  ): Promise<Array<{ key: string; value: string }>> {
    if (!translations || translations.length === 0) return []

    const allLangIds = Array.from(new Set(translations.map((t) => t.languageId)))
    const langs = await this.languagesService.getWithListId(allLangIds)
    const idToCode = new Map(langs.map((l) => [l.id, l.code]))

    return translations.map((t) => ({
      key: idToCode.get(t.languageId) || String(t.languageId),
      value: t.value
    }))
  }

  async list(pagination: PaginationQuery, lang: string = 'vi', roleName: string) {
    const langId = await this.languagesService.getIdByCode(lang)
    const isAdmin = roleName === RoleName.Admin ? true : false

    const data = await this.subscriptionPlanRepo.list(pagination, langId ?? undefined)

    // Convert nameTranslations and descriptionTranslations to { key: code, value } for admin
    // Remove translations array for non-admin
    if (data && Array.isArray((data as any).results)) {
      const results = (data as any).results
      if (isAdmin) {
        await Promise.all(
          results.map(async (item: any, idx: number) => {
            if (item.subscription) {
              const rawNameTrans = (item.subscription as any).nameTranslations || []
              const rawDescTrans =
                (item.subscription as any).descriptionTranslations || []
              const convertedNameTrans =
                await this.convertTranslationsToLangCodes(rawNameTrans)
              const convertedDescTrans =
                await this.convertTranslationsToLangCodes(rawDescTrans)

              ;(data as any).results[idx].subscription = {
                ...item.subscription,
                nameTranslations: convertedNameTrans,
                descriptionTranslations: convertedDescTrans
              }
            }
          })
        )
      } else {
        // Remove translations arrays for non-admin
        for (let i = 0; i < results.length; i++) {
          if (results[i].subscription) {
            const { nameTranslations, descriptionTranslations, ...subRest } =
              results[i].subscription
            ;(data as any).results[i].subscription = subRest
          }
        }
      }
    }

    return data
  }

  async findById(id: number, lang: string = 'vi', roleName: string) {
    const langId = await this.languagesService.getIdByCode(lang)
    const isAdmin = roleName === RoleName.Admin ? true : false

    const subscriptionPlan = await this.subscriptionPlanRepo.findById(
      id,
      langId ?? undefined
    )
    if (!subscriptionPlan) {
      throw new SubscriptionPlanNotFoundException()
    }

    // Convert translations for admin, remove for non-admin
    if (subscriptionPlan.subscription) {
      const rawNameTrans = (subscriptionPlan.subscription as any).nameTranslations || []
      const rawDescTrans =
        (subscriptionPlan.subscription as any).descriptionTranslations || []
      const features = (subscriptionPlan.subscription as any).features || []

      if (isAdmin) {
        const convertedNameTrans = await this.convertTranslationsToLangCodes(rawNameTrans)
        const convertedDescTrans = await this.convertTranslationsToLangCodes(rawDescTrans)

        // Convert feature nameTranslations for admin
        const convertedFeatures = await Promise.all(
          features.map(async (f: any) => {
            if (!f.feature || !f.feature.nameTranslations) return f

            const convertedFeatureNameTrans = await this.convertTranslationsToLangCodes(
              f.feature.nameTranslations
            )

            return {
              ...f,
              feature: {
                ...f.feature,
                nameTranslations: convertedFeatureNameTrans
              }
            }
          })
        )

        subscriptionPlan.subscription = {
          ...subscriptionPlan.subscription,
          nameTranslations: convertedNameTrans,
          descriptionTranslations: convertedDescTrans,
          features: convertedFeatures
        }
      } else {
        // Remove translations arrays for non-admin
        const { nameTranslations, descriptionTranslations, ...subRest } =
          subscriptionPlan.subscription

        // Remove feature nameTranslations arrays for non-admin
        const cleanedFeatures = features.map((f: any) => {
          if (!f.feature) return f
          const { nameTranslations: featureNameTrans, ...featureRest } = f.feature
          return {
            ...f,
            feature: featureRest
          }
        })

        subscriptionPlan.subscription = {
          ...subRest,
          features: cleanedFeatures
        }
      }
    }

    return subscriptionPlan
  }

  async create({ userId, data }: { userId: number; data: CreateSubscriptionPlanBody }) {
    try {
      const result = await this.subscriptionPlanRepo.create({
        createdById: userId,
        data: {
          ...data
        }
      })
      return result
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

  async update({
    id,
    data,
    userId
  }: {
    id: number
    data: UpdateSubscriptionPlanBody
    userId?: number
  }) {
    try {
      const subscriptionPlan = await this.subscriptionPlanRepo.update({
        id,
        data: data,
        updatedById: userId
      })
      return subscriptionPlan
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new SubscriptionPlanNotFoundException()
      }

      if (isForeignKeyConstraintPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }

  async delete({ id, userId }: { id: number; userId?: number }) {
    try {
      const existSubscriptionPlan = await this.subscriptionPlanRepo.findById(id)
      if (!existSubscriptionPlan) {
        throw new SubscriptionPlanNotFoundException()
      }

      await this.subscriptionPlanRepo.delete(id)
      return
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new SubscriptionPlanNotFoundException()
      }
      throw error
    }
  }

  async getPlansForUser(lang: string = 'vi') {
    const langId = await this.languagesService.getIdByCode(lang)
  }

  async getDiscountToSubPlan(subscriptionPlanId: number, userId: number) {
    const walletPokeCoin = await this.walletService.findByUserIdAndType(
      userId,
      walletType.POKE_COINS
    )

    const subscriptionPlan = await this.subscriptionPlanRepo.getById(subscriptionPlanId)

    if (!subscriptionPlan || !walletPokeCoin) {
      throw new NotFoundRecordException()
    }

    // Tính giá trị tối đa có thể giảm giá (50% giá gói)
    const maxDiscountAllowed = maxPokeCoinDiscount(subscriptionPlan.price)

    // Số PokeCoin user có thể sử dụng = min(số coin hiện có, 50% giá gói)
    const maxPokeCoinsCanUse = Math.min(walletPokeCoin.balance, maxDiscountAllowed)

    return {
      availablePokeCoins: walletPokeCoin.balance,
      maxPokeCoinsCanUse,
      maxDiscountAllowed
    }
  }

  // ---- For other modules (module-boundary plan B8) ----
  // Same arguments and results as the repo methods.

  getById(...args: Parameters<SubscriptionPlanRepo['getById']>) {
    return this.subscriptionPlanRepo.getById(...args)
  }

  getUserActivePlanIds(
    ...args: Parameters<SubscriptionPlanRepo['getUserActivePlanIds']>
  ) {
    return this.subscriptionPlanRepo.getUserActivePlanIds(...args)
  }

  getSubscriptionPurchaseCounts(
    ...args: Parameters<SubscriptionPlanRepo['getSubscriptionPurchaseCounts']>
  ) {
    return this.subscriptionPlanRepo.getSubscriptionPurchaseCounts(...args)
  }
}
