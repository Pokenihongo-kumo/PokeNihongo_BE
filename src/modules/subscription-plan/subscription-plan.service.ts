import { RoleName } from '@/common/constants/role.constant'
import { walletType } from '@/common/constants/wallet.constant'
import { I18nService } from '@/i18n/i18n.service'
import { SubscriptionPlanMessage } from '@/i18n/message-keys'
import { NotFoundRecordException } from '@/shared/error'
import {
  isForeignKeyConstraintPrismaError,
  isNotFoundPrismaError
} from '@/shared/helpers'
import { PaginationQueryType } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'
import { LanguagesRepo } from '../languages/languages.repo'
import { WalletRepo } from '../wallet/wallet.repo'
import { SubscriptionPlanNotFoundException } from './dto/subscription-plan.error'
import {
  CreateSubscriptionPlanBodyType,
  UpdateSubscriptionPlanBodyType
} from './entities/subscription-plan.entity'
import { SubscriptionPlanRepo } from './subscription-plan.repo'

@Injectable()
export class SubscriptionPlanService {
  constructor(
    private subscriptionPlanRepo: SubscriptionPlanRepo,
    private readonly i18nService: I18nService,
    private readonly languageRepo: LanguagesRepo,
    private readonly walletRepo: WalletRepo
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

  async list(pagination: PaginationQueryType, lang: string = 'vi', roleName: string) {
    const langId = await this.languageRepo.getIdByCode(lang)
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

    return {
      statusCode: 200,
      data,
      message: this.i18nService.translate(SubscriptionPlanMessage.GET_LIST_SUCCESS, lang)
    }
  }

  async findById(id: number, lang: string = 'vi', roleName: string) {
    const langId = await this.languageRepo.getIdByCode(lang)
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

    return {
      statusCode: 200,
      data: subscriptionPlan,
      message: this.i18nService.translate(SubscriptionPlanMessage.GET_LIST_SUCCESS, lang)
    }
  }

  async create(
    { userId, data }: { userId: number; data: CreateSubscriptionPlanBodyType },
    lang: string = 'vi'
  ) {
    try {
      const result = await this.subscriptionPlanRepo.create({
        createdById: userId,
        data: {
          ...data
        }
      })
      return {
        statusCode: 201,
        data: result,
        message: this.i18nService.translate(SubscriptionPlanMessage.CREATE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      if (isForeignKeyConstraintPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      console.log('errpr', error)

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
      data: UpdateSubscriptionPlanBodyType
      userId?: number
    },
    lang: string = 'vi'
  ) {
    try {
      const subscriptionPlan = await this.subscriptionPlanRepo.update({
        id,
        data: data,
        updatedById: userId
      })
      return {
        statusCode: 200,
        data: subscriptionPlan,
        message: this.i18nService.translate(SubscriptionPlanMessage.UPDATE_SUCCESS, lang)
      }
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

  async delete({ id, userId }: { id: number; userId?: number }, lang: string = 'vi') {
    try {
      const existSubscriptionPlan = await this.subscriptionPlanRepo.findById(id)
      if (!existSubscriptionPlan) {
        throw new SubscriptionPlanNotFoundException()
      }

      await this.subscriptionPlanRepo.delete(id)
      return {
        statusCode: 200,
        data: null,
        message: this.i18nService.translate(SubscriptionPlanMessage.DELETE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new SubscriptionPlanNotFoundException()
      }
      throw error
    }
  }

  async getPlansForUser(lang: string = 'vi') {
    const langId = await this.languageRepo.getIdByCode(lang)
  }

  async getDiscountToSubPlan(
    subscriptionPlanId: number,
    userId: number,
    lang: string = 'vi'
  ) {
    const walletPokeCoin = await this.walletRepo.findByUserIdAndType(
      userId,
      walletType.POKE_COINS
    )

    const subscriptionPlan = await this.subscriptionPlanRepo.getById(subscriptionPlanId)

    if (!subscriptionPlan || !walletPokeCoin) {
      throw new NotFoundRecordException()
    }

    // Tính giá trị tối đa có thể giảm giá (50% giá gói)
    const maxDiscountAllowed = Math.floor(subscriptionPlan.price * 0.5)

    // Số PokeCoin user có thể sử dụng = min(số coin hiện có, 50% giá gói)
    const maxPokeCoinsCanUse = Math.min(walletPokeCoin.balance, maxDiscountAllowed)

    return {
      statusCode: 200,
      data: {
        availablePokeCoins: walletPokeCoin.balance,
        maxPokeCoinsCanUse,
        maxDiscountAllowed
      },
      message: this.i18nService.translate(SubscriptionPlanMessage.GET_LIST_SUCCESS, lang)
    }
  }
}
