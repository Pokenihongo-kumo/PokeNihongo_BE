import { RoleName } from '@/common/constants/role.constant'
import { I18nService } from '@/i18n/i18n.service'
import { AchievementMessage } from '@/i18n/message-keys'
import {
  LanguageNotExistToTranslateException,
  NotFoundRecordException
} from '@/shared/error'
import {
  isForeignKeyConstraintPrismaError,
  isNotFoundPrismaError,
  isUniqueConstraintPrismaError
} from '@/shared/helpers'
import { PaginationQueryType } from '@/shared/models/request.model'
import { PrismaService } from '@/shared/services/prisma.service'
import { HttpStatus, Injectable } from '@nestjs/common'
import { LanguagesRepo } from '../languages/languages.repo'
import { CreateTranslationBodyType } from '../translation/entities/translation.entity'
import { TranslationRepo } from '../translation/translation.repo'
import { AchievementRepo } from './achievement.repo'
import { AchievementAlreadyExistsException } from './dto/achievement.error'
import {
  CreateAchievementBodyInputType,
  CreateAchievementBodyType,
  UpdateAchievementBodyInputType,
  UpdateAchievementBodyType
} from './entities/achievement.entity'

@Injectable()
export class AchievementService {
  constructor(
    private achievementRepo: AchievementRepo,
    private readonly i18nService: I18nService,
    private readonly languageRepo: LanguagesRepo,
    private readonly translationRepo: TranslationRepo,
    private readonly prismaService: PrismaService
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

    const data = await this.achievementRepo.list(pagination, langId ?? undefined, isAdmin)

    // Admins receive translations converted to { key: code, value } format.
    // Non-admins should not receive bulky translation arrays to keep payload light.
    if (data && Array.isArray(data.results)) {
      const results = data.results
      if (isAdmin) {
        const allLangIds = new Set<number>()

        // Collect all unique language IDs from all translation types
        results.forEach((achievement: any) => {
          ;(achievement.nameTranslations || []).forEach((t: any) =>
            allLangIds.add(t.languageId)
          )
          ;(achievement.descriptionTranslations || []).forEach((t: any) =>
            allLangIds.add(t.languageId)
          )
          ;(achievement.conditionTextTranslations || []).forEach((t: any) =>
            allLangIds.add(t.languageId)
          )
        })

        const langs = await this.languageRepo.getWithListId(Array.from(allLangIds))
        const idToCode = new Map(langs.map((l) => [l.id, l.code]))

        // Map each achievement's translations
        data.results = results.map((achievement: any) => {
          const nameTranslations = (achievement.nameTranslations || []).map((t: any) => ({
            key: idToCode.get(t.languageId) || String(t.languageId),
            value: t.value
          }))

          const descriptionTranslations = (achievement.descriptionTranslations || []).map(
            (t: any) => ({
              key: idToCode.get(t.languageId) || String(t.languageId),
              value: t.value
            })
          )

          const conditionTextTranslations = (
            achievement.conditionTextTranslations || []
          ).map((t: any) => ({
            key: idToCode.get(t.languageId) || String(t.languageId),
            value: t.value
          }))

          return {
            ...achievement,
            nameTranslations,
            descriptionTranslations,
            conditionTextTranslations
          }
        })
      } else {
        // strip raw translation arrays for non-admin consumers
        for (let i = 0; i < results.length; i++) {
          const {
            nameTranslations,
            descriptionTranslations,
            conditionTextTranslations,
            ...rest
          } = results[i]
          ;(data as any).results[i] = rest
        }
      }
    }

    return {
      data,
      message: this.i18nService.translate(AchievementMessage.GET_LIST_SUCCESS, lang)
    }
  }

  async findById(id: number, roleName: string, lang: string = 'vi') {
    const langId = await this.languageRepo.getIdByCode(lang)
    const isAdmin = roleName === RoleName.Admin ? true : false

    if (!langId) {
      return {
        data: null,
        message: this.i18nService.translate(AchievementMessage.GET_SUCCESS, lang)
      }
    }

    const achievement = await this.achievementRepo.findByIdWithLangId(id, isAdmin, langId)
    if (!achievement) {
      throw new NotFoundRecordException()
    }

    // Convert translations to language code format for admin
    const nameTranslations = await this.convertTranslationsToLangCodes(
      (achievement as any).nameTranslations || []
    )
    const descriptionTranslations = await this.convertTranslationsToLangCodes(
      (achievement as any).descriptionTranslations || []
    )
    const conditionTextTranslations = await this.convertTranslationsToLangCodes(
      (achievement as any).conditionTextTranslations || []
    )

    // Get current language translations
    const currentNameTranslation = ((achievement as any).nameTranslations || []).find(
      (t: any) => t.languageId === langId
    )
    const currentDescriptionTranslation = (
      (achievement as any).descriptionTranslations || []
    ).find((t: any) => t.languageId === langId)
    const currentConditionTextTranslation = (
      (achievement as any).conditionTextTranslations || []
    ).find((t: any) => t.languageId === langId)

    // Map reward (include current language translation, and full translations for admin)
    let rewardResult: any = null
    if ((achievement as any).reward) {
      const reward = (achievement as any).reward

      const rewardNameTranslations = await this.convertTranslationsToLangCodes(
        (reward as any).nameTranslations || []
      )
      const currentRewardName = ((reward as any).nameTranslations || []).find(
        (t: any) => t.languageId === langId
      )
      const { nameTranslations: _rnt, ...rewardWithoutTranslations } = reward as any
      rewardResult = {
        ...rewardWithoutTranslations,
        nameTranslation: currentRewardName?.value ?? null,
        ...(isAdmin ? { nameTranslations: rewardNameTranslations } : {})
      }
    }

    // Remove raw translation arrays from response
    const {
      nameTranslations: _,
      descriptionTranslations: __,
      conditionTextTranslations: ___,
      ...achievementWithoutTranslations
    } = achievement as any

    const result = {
      ...achievementWithoutTranslations,
      nameTranslation: currentNameTranslation?.value ?? null,
      descriptionTranslation: currentDescriptionTranslation?.value ?? null,
      conditionTextTranslation: currentConditionTextTranslation?.value ?? null,
      reward: rewardResult,
      ...(isAdmin
        ? {
            nameTranslations,
            descriptionTranslations,
            conditionTextTranslations
          }
        : {})
    }

    return {
      statusCode: HttpStatus.OK,
      data: result,
      message: this.i18nService.translate(AchievementMessage.GET_SUCCESS, lang)
    }
  }

  async create(
    {
      data,
      createdById
    }: {
      data: CreateAchievementBodyInputType
      createdById: number
    },
    lang: string = 'vi'
  ) {
    let createdAchievement: any = null

    try {
      return await this.achievementRepo.withTransaction(async (prismaTx) => {
        const nameKey = `achievement.name.${Date.now()}`
        const descriptionKey = `achievement.description.${Date.now()}`
        const conditionTextKey = `achievement.conditionText.${Date.now()}`
        let hasOpened = false

        const dataCreate: CreateAchievementBodyType = {
          nameKey,
          descriptionKey,
          conditionTextKey,
          imageUrl: data.imageUrl,
          isActive: data.isActive,
          achievementTierType: data.achievementTierType,
          conditionType: data.conditionType,
          conditionValue: data.conditionValue,
          conditionElementId: data.conditionElementId,
          rewardId: data.rewardId,
          groupId: data.groupId
        }

        createdAchievement = await this.achievementRepo.create(
          {
            createdById,
            data: {
              ...dataCreate
            }
          },
          prismaTx
        )

        // Now we have id, create proper keys
        const fNameKey = `achievement.name.${createdAchievement.id}`
        const fDescriptionKey = `achievement.description.${createdAchievement.id}`
        const fConditionTextKey = `achievement.conditionText.${createdAchievement.id}`

        // Collect all language codes from all translation inputs
        const allLangCodes = Array.from(
          new Set([
            ...data.nameTranslations.map((t) => t.key),
            ...data.descriptionTranslations.map((t) => t.key),
            ...data.conditionTextTranslations.map((t) => t.key)
          ])
        )

        // Get languages corresponding to the keys
        const languages = await this.languageRepo.getWithListCode(allLangCodes)

        // Create map { code: id } for quick access
        const langMap = Object.fromEntries(languages.map((l) => [l.code, l.id]))

        // Check if any language is missing
        const missingLangs = allLangCodes.filter((code) => !langMap[code])
        if (missingLangs.length > 0) {
          throw new LanguageNotExistToTranslateException()
        }

        // Create translation records for all three fields
        const nameTranslationRecords: CreateTranslationBodyType[] = []
        const descriptionTranslationRecords: CreateTranslationBodyType[] = []
        const conditionTextTranslationRecords: CreateTranslationBodyType[] = []

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

        // conditionTextTranslations → key = fConditionTextKey
        for (const item of data.conditionTextTranslations) {
          conditionTextTranslationRecords.push({
            languageId: langMap[item.key],
            key: fConditionTextKey,
            value: item.value
          })
        }

        // Validate all translation records
        await this.translationRepo.validateTranslationRecords([...nameTranslationRecords])

        // Update achievement with final keys and translations
        const result = await this.achievementRepo.update(
          {
            id: createdAchievement.id,
            data: {
              nameKey: fNameKey,
              descriptionKey: fDescriptionKey,
              conditionTextKey: fConditionTextKey,
              nameTranslations: nameTranslationRecords,
              descriptionTranslations: descriptionTranslationRecords,
              conditionTextTranslations: conditionTextTranslationRecords,
              achievementNameKey: fNameKey,
              achievementDescriptionKey: fDescriptionKey,
              achievementConditionTextKey: fConditionTextKey
            }
          },
          prismaTx
        )

        return {
          statusCode: HttpStatus.CREATED,
          data: result,
          message: this.i18nService.translate(AchievementMessage.CREATE_SUCCESS, lang)
        }
      })
    } catch (error) {
      // Rollback: Delete achievement if created
      if (createdAchievement?.id) {
        try {
          await this.achievementRepo.delete(
            {
              id: createdAchievement.id,
              deletedById: createdById
            },
            true
          )
        } catch (rollbackError) {}
      }

      if (isUniqueConstraintPrismaError(error)) {
        throw new AchievementAlreadyExistsException()
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
      data: UpdateAchievementBodyInputType
      updatedById: number
    },
    lang: string = 'vi'
  ) {
    let existingAchievement: any = null

    try {
      return await this.achievementRepo.withTransaction(async (prismaTx) => {
        let hasOpen = false
        let nameTranslationRecords: CreateTranslationBodyType[] = []
        let descriptionTranslationRecords: CreateTranslationBodyType[] = []
        let conditionTextTranslationRecords: CreateTranslationBodyType[] = []

        // Get current record
        existingAchievement = await this.achievementRepo.findById(id)
        if (!existingAchievement) throw new NotFoundRecordException()

        // Prepare data for update
        const dataUpdate: Partial<UpdateAchievementBodyType> = {}

        if (data.imageUrl !== undefined) dataUpdate.imageUrl = data.imageUrl
        if (data.achievementTierType !== undefined)
          dataUpdate.achievementTierType = data.achievementTierType
        if (data.conditionType !== undefined)
          dataUpdate.conditionType = data.conditionType
        if (data.conditionValue !== undefined)
          dataUpdate.conditionValue = data.conditionValue
        if (data.conditionElementId !== undefined)
          dataUpdate.conditionElementId = data.conditionElementId
        if (data.rewardId !== undefined) dataUpdate.rewardId = data.rewardId
        if (data.groupId !== undefined) dataUpdate.groupId = data.groupId
        if (data.isActive !== undefined) dataUpdate.isActive = data.isActive
        // Handle translations if provided
        const allLangCodes: string[] = []

        if (data.nameTranslations) {
          allLangCodes.push(...data.nameTranslations.map((t) => t.key))
        }
        if (data.descriptionTranslations) {
          allLangCodes.push(...data.descriptionTranslations.map((t) => t.key))
        }
        if (data.conditionTextTranslations) {
          allLangCodes.push(...data.conditionTextTranslations.map((t) => t.key))
        }

        if (allLangCodes.length > 0) {
          const uniqueLangCodes = Array.from(new Set(allLangCodes))

          // Get languages
          const languages = await this.languageRepo.getWithListCode(uniqueLangCodes)
          const langMap = Object.fromEntries(languages.map((l) => [l.code, l.id]))

          // Check missing language
          const missingLangs = uniqueLangCodes.filter((code) => !langMap[code])
          if (missingLangs.length > 0) throw new LanguageNotExistToTranslateException()

          // Create translation records for nameTranslations
          if (data.nameTranslations) {
            for (const t of data.nameTranslations) {
              nameTranslationRecords.push({
                languageId: langMap[t.key],
                key: existingAchievement.nameKey,
                value: t.value
              })
            }
          }

          // Create translation records for descriptionTranslations
          if (data.descriptionTranslations) {
            for (const t of data.descriptionTranslations) {
              descriptionTranslationRecords.push({
                languageId: langMap[t.key],
                key: existingAchievement.descriptionKey,
                value: t.value
              })
            }
          }

          // Create translation records for conditionTextTranslations
          if (data.conditionTextTranslations) {
            for (const t of data.conditionTextTranslations) {
              conditionTextTranslationRecords.push({
                languageId: langMap[t.key],
                key: existingAchievement.conditionTextKey,
                value: t.value
              })
            }
          }

          // Validate translation records
          await this.translationRepo.validateTranslationRecords([
            ...nameTranslationRecords
          ])
        }

        // Update Achievement main record
        const updatedAchievement = await this.achievementRepo.update(
          {
            id,
            updatedById,
            data: {
              ...dataUpdate,
              nameTranslations:
                nameTranslationRecords.length > 0 ? nameTranslationRecords : undefined,
              descriptionTranslations:
                descriptionTranslationRecords.length > 0
                  ? descriptionTranslationRecords
                  : undefined,
              conditionTextTranslations:
                conditionTextTranslationRecords.length > 0
                  ? conditionTextTranslationRecords
                  : undefined,
              achievementNameKey: existingAchievement.nameKey,
              achievementDescriptionKey: existingAchievement.descriptionKey,
              achievementConditionTextKey: existingAchievement.conditionTextKey
            }
          },
          prismaTx
        )

        return {
          statusCode: HttpStatus.OK,
          data: updatedAchievement,
          message: this.i18nService.translate(AchievementMessage.UPDATE_SUCCESS, lang)
        }
      })
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      if (isUniqueConstraintPrismaError(error)) {
        throw new AchievementAlreadyExistsException()
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
      const existingAchievement = await this.achievementRepo.findById(id)
      if (!existingAchievement) {
        throw new NotFoundRecordException()
      }

      await Promise.all([
        this.achievementRepo.delete({
          id,
          deletedById
        }),
        this.translationRepo.deleteByKey(existingAchievement.nameKey),
        this.translationRepo.deleteByKey(existingAchievement.descriptionKey),
        this.translationRepo.deleteByKey(existingAchievement.conditionTextKey)
      ])

      return {
        statusCode: HttpStatus.OK,
        data: null,
        message: this.i18nService.translate(AchievementMessage.DELETE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }
}
