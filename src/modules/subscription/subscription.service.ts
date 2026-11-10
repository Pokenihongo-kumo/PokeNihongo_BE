import { InvoiceStatus } from '@/common/constants/invoice.constant'
import { RoleName } from '@/common/constants/role.constant'
import { I18nService } from '@/i18n/i18n.service'
import { SubscriptionMessage } from '@/i18n/message-keys'
import {
  LanguageNotExistToTranslateException,
  NotFoundRecordException
} from '@/shared/error'
import {
  isForeignKeyConstraintPrismaError,
  isNotFoundPrismaError,
  isUniqueConstraintPrismaError,
  todayUTCWith0000
} from '@/shared/helpers'
import { PaginationQueryType } from '@/shared/models/request.model'
import { HttpStatus, Injectable } from '@nestjs/common'
import { InvoiceRepo } from '../invoice/invoice.repo'
import { LanguagesRepo } from '../languages/languages.repo'
import { SubscriptionPlanRepo } from '../subscription-plan/subscription-plan.repo'
import { CreateTranslationBodyType } from '../translation/entities/translation.entity'
import { TranslationRepo } from '../translation/translation.repo'
import { SubscriptionAlreadyExistsException } from './dto/subscription.error'
import {
  CreateSubscriptionBodyInputType,
  CreateSubscriptionBodyType,
  UpdateSubscriptionBodyInputType,
  UpdateSubscriptionBodyType
} from './entities/subscription.entity'
import { SubscriptionRepo } from './subscription.repo'

@Injectable()
export class SubscriptionService {
  constructor(
    private subscriptionRepo: SubscriptionRepo,
    private subscriptionPlanRepo: SubscriptionPlanRepo,
    private readonly i18nService: I18nService,
    private readonly languageRepo: LanguagesRepo,
    private readonly translationRepo: TranslationRepo,
    private readonly invoiceRepo: InvoiceRepo
  ) {}

  private async convertTranslationsToLangCodes(
    nameTranslations: Array<{ languageId: number; value: string }>
  ): Promise<Array<{ key: string; value: string }>> {
    if (!nameTranslations || nameTranslations.length === 0) return []

    const allLangIds = Array.from(new Set(nameTranslations.map((t) => t.languageId)))
    const langs = await this.languageRepo.getWithListId(allLangIds)
    const idToCode = new Map(langs.map((l) => [l.id, l.code]))

    return nameTranslations.map((t) => ({
      key: idToCode.get(t.languageId) || String(t.languageId),
      value: t.value
    }))
  }

  async list(pagination: PaginationQueryType, lang: string = 'vi', roleName: string) {
    const langId = await this.languageRepo.getIdByCode(lang)
    const isAdmin = roleName === RoleName.Admin ? true : false

    const data = await this.subscriptionRepo.list(
      pagination,
      langId ?? undefined,
      isAdmin
    )

    // Nếu là admin thì chuyển các `nameTranslations` và `descriptionTranslations` thành chuẩn { key: code, value }
    // Ngược lại (non-admin) thì loại bỏ hoàn toàn trường `nameTranslations` và `descriptionTranslations` để trả payload nhẹ
    if (data && Array.isArray((data as any).results)) {
      const results = (data as any).results
      if (isAdmin) {
        await Promise.all(
          results.map(async (item: any, idx: number) => {
            const rawNameTrans = (item as any).nameTranslations || []
            const rawDescTrans = (item as any).descriptionTranslations || []
            const convertedNameTrans =
              await this.convertTranslationsToLangCodes(rawNameTrans)
            const convertedDescTrans =
              await this.convertTranslationsToLangCodes(rawDescTrans)
            ;(data as any).results[idx] = {
              ...item,
              nameTranslations: convertedNameTrans,
              descriptionTranslations: convertedDescTrans
            }
          })
        )
      } else {
        // remove translations array for non-admin consumers
        for (let i = 0; i < results.length; i++) {
          const { nameTranslations, descriptionTranslations, ...rest } = results[i]
          ;(data as any).results[i] = rest
        }
      }
    }

    return {
      data,
      message: this.i18nService.translate(SubscriptionMessage.GET_LIST_SUCCESS, lang)
    }
  }

  async findById(id: number, roleName: string, lang: string = 'vi') {
    const langId = await this.languageRepo.getIdByCode(lang)
    const isAdmin = roleName === RoleName.Admin ? true : false

    if (!langId) {
      return {
        data: null,
        message: this.i18nService.translate(SubscriptionMessage.GET_SUCCESS, lang)
      }
    }

    const subscription = await this.subscriptionRepo.findByIdWithLangId(
      id,
      isAdmin,
      langId
    )
    if (!subscription) {
      throw new NotFoundRecordException()
    }
    const nameTranslations = await this.convertTranslationsToLangCodes(
      (subscription as any).nameTranslations || []
    )
    const descriptionTranslations = await this.convertTranslationsToLangCodes(
      (subscription as any).descriptionTranslations || []
    )

    const currentNameTranslation = ((subscription as any).nameTranslations || []).find(
      (t: any) => t.languageId === langId
    )
    const currentDescriptionTranslation = (
      (subscription as any).descriptionTranslations || []
    ).find((t: any) => t.languageId === langId)

    // Chuyển nameTranslations và descriptionTranslations -> chỉ lấy bản dịch hiện tại (current)
    // và loại bỏ top-level `nameTranslations` và `descriptionTranslations` trong `transformed` để tránh trả về
    // trường này cho người dùng non-admin (nếu cần admin sẽ được thêm lại bên dưới)
    const transformed = subscription
      ? {
          ...subscription,
          // remove top-level translations to avoid leaking for non-admin
          nameTranslations: undefined,
          descriptionTranslations: undefined
        }
      : null

    return {
      statusCode: HttpStatus.OK,
      data: {
        ...transformed,
        nameTranslation: currentNameTranslation?.value ?? null,
        descriptionTranslation: currentDescriptionTranslation?.value ?? null,
        ...(isAdmin ? { nameTranslations, descriptionTranslations } : {})
      },
      message: this.i18nService.translate(SubscriptionMessage.GET_SUCCESS, lang)
    }
  }

  async findByIdWithAllLang(id: number, lang: string = 'vi') {
    const langId = await this.languageRepo.getIdByCode(lang)

    const subscription: any = await this.subscriptionRepo.findByIdWithAllLang(id)
    if (!subscription) {
      throw new NotFoundRecordException()
    }

    // derive single-language name for current lang if available
    const nameTranslation = langId
      ? (subscription.nameTranslations?.find((t: any) => t.languageId === langId)
          ?.value ?? null)
      : null

    // map array to { key: code, value }
    const languages = await this.languageRepo.getWithListId(
      Array.from(
        new Set((subscription.nameTranslations ?? []).map((t: any) => t.languageId))
      )
    )
    const codeMap = Object.fromEntries(languages.map((l) => [l.id, l.code]))

    const result = {
      ...subscription,
      nameTranslations: (subscription.nameTranslations ?? []).map((t: any) => ({
        key: codeMap[t.languageId] ?? String(t.languageId),
        value: t.value
      }))
    }

    return {
      statusCode: HttpStatus.OK,
      data: result,
      message: this.i18nService.translate(SubscriptionMessage.GET_SUCCESS, lang)
    }
  }

  async create(
    {
      data,
      createdById
    }: {
      data: CreateSubscriptionBodyInputType
      createdById: number
    },
    lang: string = 'vi'
  ) {
    let createdSubscription: any = null

    try {
      return await this.subscriptionRepo.withTransaction(async (prismaTx) => {
        const nameKey = `subscription.name.${Date.now()}`
        const descriptionKey = `subscription.description.${Date.now()}`

        // Convert data for create
        const now = todayUTCWith0000()
        const dataCreate: CreateSubscriptionBodyType = {
          nameKey,
          descriptionKey,
          tagName: data.tagName
        }

        createdSubscription = await this.subscriptionRepo.create(
          {
            createdById,
            data: {
              ...dataCreate
            }
          },
          prismaTx
        )

        // Now we have id, create proper keys
        const fNameKey = `subscription.name.${createdSubscription.id}`
        const fDescriptionKey = `subscription.description.${createdSubscription.id}`

        // Collect all language codes from both name and description translations
        const nameList = data.nameTranslations.map((t) => t.key)
        const descriptionList = data.descriptionTranslations.map((t) => t.key)

        // Get unique language codes
        const allLangCodes = Array.from(new Set([...nameList, ...descriptionList]))

        // Get languages corresponding to the keys
        const languages = await this.languageRepo.getWithListCode(allLangCodes)

        // Create map { code: id } for quick access
        const langMap = Object.fromEntries(languages.map((l) => [l.code, l.id]))

        // Check if any language is missing
        const missingLangs = allLangCodes.filter((code) => !langMap[code])
        if (missingLangs.length > 0) {
          throw new LanguageNotExistToTranslateException()
        }

        // Create translation records
        const nameTranslationRecords: CreateTranslationBodyType[] = []
        const descriptionTranslationRecords: CreateTranslationBodyType[] = []

        // nameTranslations → key = fNameKey
        for (const item of data.nameTranslations) {
          nameTranslationRecords.push({
            languageId: langMap[item.key],
            key: fNameKey,
            value: item.value
          })
        }

        // descriptionTranslations → key = fDescriptionKey
        for (const item of data.descriptionTranslations) {
          descriptionTranslationRecords.push({
            languageId: langMap[item.key],
            key: fDescriptionKey,
            value: item.value
          })
        }

        // Validate translations (check for duplicate names)
        await this.translationRepo.validateTranslationRecords([...nameTranslationRecords])

        // Update subscription with final keys and translations
        const result = await this.subscriptionRepo.update(
          {
            id: createdSubscription.id,
            data: {
              nameKey: fNameKey,
              descriptionKey: fDescriptionKey,
              nameTranslations: nameTranslationRecords,
              descriptionTranslations: descriptionTranslationRecords,
              subscriptionNameKey: fNameKey,
              subscriptionDescriptionKey: fDescriptionKey
            }
          },
          prismaTx
        )

        return {
          statusCode: HttpStatus.CREATED,
          data: result,
          message: this.i18nService.translate(SubscriptionMessage.CREATE_SUCCESS, lang)
        }
      })
    } catch (error) {
      // Rollback: Delete subscription if created
      if (createdSubscription?.id) {
        try {
          await this.subscriptionRepo.delete(
            {
              id: createdSubscription.id,
              deletedById: createdById
            },
            true
          )
        } catch (rollbackError) {}
      }

      if (isUniqueConstraintPrismaError(error)) {
        throw new SubscriptionAlreadyExistsException()
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
      data: UpdateSubscriptionBodyInputType
      updatedById: number
    },
    lang: string = 'vi'
  ) {
    let existingSubscription: any = null

    try {
      return await this.subscriptionRepo.withTransaction(async (prismaTx) => {
        let hasOpen = false
        let translationRecords: CreateTranslationBodyType[] = []
        // Get current record
        existingSubscription = await this.subscriptionRepo.findById(id)
        if (!existingSubscription) throw new NotFoundRecordException()

        // Prepare data for update
        const dataUpdate: Partial<UpdateSubscriptionBodyType> = {}

        if (data.tagName) {
          dataUpdate.tagName = data.tagName
        }

        // Handle translations if provided
        let nameTranslationRecords: CreateTranslationBodyType[] = []
        let descriptionTranslationRecords: CreateTranslationBodyType[] = []

        if (data.nameTranslations || data.descriptionTranslations) {
          const nameList = data.nameTranslations?.map((t) => t.key) || []
          const descriptionList = data.descriptionTranslations?.map((t) => t.key) || []
          const allLangCodes = Array.from(new Set([...nameList, ...descriptionList]))

          if (allLangCodes.length > 0) {
            // Get languages
            const languages = await this.languageRepo.getWithListCode(allLangCodes)
            const langMap = Object.fromEntries(languages.map((l) => [l.code, l.id]))

            // Check missing language
            const missingLangs = allLangCodes.filter((code) => !langMap[code])
            if (missingLangs.length > 0) throw new LanguageNotExistToTranslateException()

            // Create nameTranslation records if provided
            if (data.nameTranslations) {
              for (const t of data.nameTranslations) {
                nameTranslationRecords.push({
                  languageId: langMap[t.key],
                  key: existingSubscription.nameKey,
                  value: t.value
                })
              }
            }

            // Create descriptionTranslation records if provided
            if (data.descriptionTranslations) {
              for (const t of data.descriptionTranslations) {
                descriptionTranslationRecords.push({
                  languageId: langMap[t.key],
                  key: existingSubscription.descriptionKey,
                  value: t.value
                })
              }
            }

            // Validate translation records
            await this.translationRepo.validateTranslationRecords([
              ...nameTranslationRecords
            ])
          }
        }

        // Update Subscription main record
        const updatedSubscription = await this.subscriptionRepo.update(
          {
            id,
            updatedById,
            data: {
              ...dataUpdate,
              ...(nameTranslationRecords.length > 0
                ? { nameTranslations: nameTranslationRecords }
                : {}),
              ...(descriptionTranslationRecords.length > 0
                ? { descriptionTranslations: descriptionTranslationRecords }
                : {}),
              subscriptionNameKey: existingSubscription.nameKey,
              subscriptionDescriptionKey: existingSubscription.descriptionKey
            }
          },
          prismaTx
        )

        return {
          statusCode: HttpStatus.OK,
          data: updatedSubscription,
          message: this.i18nService.translate(SubscriptionMessage.UPDATE_SUCCESS, lang)
        }
      })
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      if (isUniqueConstraintPrismaError(error)) {
        throw new SubscriptionAlreadyExistsException()
      }
      if (isForeignKeyConstraintPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }

  async delete(
    { id, deletedById }: { id: number; deletedById: number },
    lang: string = 'vi'
  ) {
    try {
      const existingSubscription = await this.subscriptionRepo.findById(id)
      if (!existingSubscription) {
        throw new NotFoundRecordException()
      }

      await Promise.all([
        this.subscriptionRepo.delete({
          id,
          deletedById
        }),
        this.translationRepo.deleteByKey(existingSubscription.nameKey)
      ])

      return {
        statusCode: HttpStatus.OK,
        data: null,
        message: this.i18nService.translate(SubscriptionMessage.DELETE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }

  async listForMarketplace(lang: string = 'vi', roleName: string, userId?: number) {
    const langId = await this.languageRepo.getIdByCode(lang)
    const isAdmin = roleName === RoleName.Admin

    // Step 1: Get subscriptions with active plans, sorted by tagName
    const subscriptions = await this.subscriptionRepo.getSubscriptionsWithActivePlans(
      langId ?? undefined
    )

    // Step 2: Get user's active subscription plan IDs
    const userActivePlanIds = userId
      ? await this.subscriptionPlanRepo.getUserActivePlanIds(userId)
      : []

    // Step 3: Get purchase counts per subscription plan
    const planPurchaseCounts =
      await this.subscriptionPlanRepo.getSubscriptionPurchaseCounts()

    // Step 3.5: Get user's pending invoices if userId provided
    const userPendingInvoices: Record<number, any> = {}
    if (userId) {
      const allPlanIds = subscriptions.flatMap((sub: any) =>
        sub.plans.map((plan: any) => plan.id)
      )
      const pendingInvoicesData = await Promise.all(
        allPlanIds.map((planId) =>
          this.invoiceRepo.findActiveByUserIdPlanIdAndStatus(
            userId,
            planId,
            InvoiceStatus.PENDING
          )
        )
      )
      pendingInvoicesData.forEach((invoice, idx) => {
        if (invoice) {
          userPendingInvoices[allPlanIds[idx]] = invoice
        }
      })
    }

    // Calculate total purchase count per subscription (sum of all its plans)
    const subscriptionPurchaseCounts: Record<number, number> = {}
    subscriptions.forEach((sub: any) => {
      const total = sub.plans.reduce((sum: number, plan: any) => {
        return sum + (planPurchaseCounts[plan.id] || 0)
      }, 0)
      subscriptionPurchaseCounts[sub.id] = total
    })

    // Step 4: Find the subscription with the highest purchase count
    const maxPurchases = Math.max(...Object.values(subscriptionPurchaseCounts), 0)

    // Step 5: Map subscriptions and add canBuy and isPopular fields
    const results = await Promise.all(
      subscriptions.map(async (sub: any) => {
        const {
          nameTranslations,
          descriptionTranslations,
          features,
          plans,
          nameKey,
          descriptionKey,
          createdAt,
          updatedAt,
          createdById,
          updatedById,
          deletedAt,
          deletedById,
          ...rest
        } = sub

        // Check if user has any active plan in this subscription
        const hasActivePlan = plans.some((plan: any) =>
          userActivePlanIds.includes(plan.id)
        )

        // Clean plans - remove meta fields and add pending invoice if exists
        const cleanedPlans = plans.map((plan: any) => {
          const {
            createdAt,
            updatedAt,
            createdById,
            updatedById,
            deletedAt,
            deletedById,
            ...planRest
          } = plan
          const pendingInvoice = userPendingInvoices[plan.id]
          return {
            ...planRest,
            ...(pendingInvoice
              ? {
                  pendingInvoice: {
                    id: pendingInvoice.id,
                    subtotalAmount: pendingInvoice.subtotalAmount,
                    discountAmount: pendingInvoice.discountAmount,
                    totalAmount: pendingInvoice.totalAmount,
                    status: pendingInvoice.status
                  }
                }
              : {})
          }
        })

        // Process features for admin/non-admin
        let processedFeatures = features
        if (!isAdmin) {
          // Remove nameTranslations for non-admin
          processedFeatures = features.map((f: any) => {
            const { feature, ...featureRest } = f
            if (!feature) return f
            const { nameTranslations, ...featureDetails } = feature
            return {
              ...featureRest,
              feature: {
                ...featureDetails
              }
            }
          })
        } else {
          // Convert feature nameTranslations for admin
          processedFeatures = await Promise.all(
            features.map(async (f: any) => {
              const { feature, ...featureRest } = f
              if (!feature) return f
              const { nameTranslations: featureNameTrans, ...featureDetails } = feature

              const convertedNameTrans =
                await this.convertTranslationsToLangCodes(featureNameTrans)

              return {
                ...featureRest,
                feature: {
                  ...featureDetails,
                  nameTranslations: convertedNameTrans
                }
              }
            })
          )
        }

        const purchaseCount = subscriptionPurchaseCounts[sub.id] || 0
        const isPopular = maxPurchases > 0 && purchaseCount === maxPurchases

        const result: any = {
          ...rest,
          plans: cleanedPlans,
          features: processedFeatures,
          isPopular,
          canBuy: !hasActivePlan
        }

        // Add translations based on admin role
        if (isAdmin) {
          const convertedNameTrans =
            await this.convertTranslationsToLangCodes(nameTranslations)
          const convertedDescTrans = await this.convertTranslationsToLangCodes(
            descriptionTranslations
          )

          result.nameTranslations = convertedNameTrans
          result.descriptionTranslations = convertedDescTrans
        }

        return result
      })
    )

    return {
      statusCode: HttpStatus.OK,
      data: results,
      message: this.i18nService.translate(SubscriptionMessage.GET_LIST_SUCCESS, lang)
    }
  }

  async getMarketplaceOptions(
    subscriptionId: number,
    lang: string = 'vi',
    roleName: string
  ) {
    const langId = await this.languageRepo.getIdByCode(lang)
    const isAdmin = roleName === RoleName.Admin

    // Get subscription with active plans
    const subscription = await this.subscriptionRepo.getSubscriptionsWithActivePlans(
      langId ?? undefined
    )

    // Find the specific subscription
    const sub = subscription.find((s: any) => s.id === subscriptionId)

    if (!sub) {
      throw new NotFoundRecordException()
    }

    const {
      nameTranslations,
      descriptionTranslations,
      features,
      plans,
      nameKey,
      descriptionKey,
      createdAt,
      updatedAt,
      createdById,
      updatedById,
      deletedAt,
      deletedById,
      ...rest
    } = sub

    // Clean plans - remove meta fields
    const cleanedPlans = plans.map((plan: any) => {
      const {
        createdAt,
        updatedAt,
        createdById,
        updatedById,
        deletedAt,
        deletedById,
        ...planRest
      } = plan
      return planRest
    })

    // Process features for admin/non-admin
    let processedFeatures = features
    if (!isAdmin) {
      // Remove nameTranslations for non-admin
      processedFeatures = features.map((f: any) => {
        const { feature, ...featureRest } = f
        if (!feature) return f
        const { nameTranslations, ...featureDetails } = feature
        return {
          ...featureRest,
          feature: {
            ...featureDetails
          }
        }
      })
    } else {
      // Convert feature nameTranslations for admin
      processedFeatures = await Promise.all(
        features.map(async (f: any) => {
          const { feature, ...featureRest } = f
          if (!feature) return f
          const { nameTranslations: featureNameTrans, ...featureDetails } = feature

          const convertedNameTrans =
            await this.convertTranslationsToLangCodes(featureNameTrans)

          return {
            ...featureRest,
            feature: {
              ...featureDetails,
              nameTranslations: convertedNameTrans
            }
          }
        })
      )
    }

    const result: any = {
      ...rest,
      plans: cleanedPlans,
      features: processedFeatures
    }

    // Add translations based on admin role
    if (isAdmin) {
      const convertedNameTrans =
        await this.convertTranslationsToLangCodes(nameTranslations)
      const convertedDescTrans = await this.convertTranslationsToLangCodes(
        descriptionTranslations
      )

      result.nameTranslations = convertedNameTrans
      result.descriptionTranslations = convertedDescTrans
    }

    return {
      statusCode: HttpStatus.OK,
      data: result,
      message: this.i18nService.translate(SubscriptionMessage.GET_SUCCESS, lang)
    }
  }
}
