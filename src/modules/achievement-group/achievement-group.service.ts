import { RoleName } from '@/common/constants/role.constant'
import { I18nService } from '@/i18n/i18n.service'
import { AchievementGroupMessage } from '@/i18n/message-keys'
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
import { CreateTranslationBodyType } from '../translation/entities/translation.entities'
import { TranslationRepository } from '../translation/translation.repo'
import { AchievementGroupRepo } from './achievement-group.repo'
import { AchievementGroupAlreadyExistsException } from './dto/achievement-group.error'
import {
  CreateAchievementGroupBodyInputType,
  CreateAchievementGroupBodyType,
  UpdateAchievementGroupBodyInputType,
  UpdateAchievementGroupBodyType
} from './entities/achievement-group.entity'

@Injectable()
export class AchievementGroupService {
  constructor(
    private achievementGroupRepo: AchievementGroupRepo,
    private readonly i18nService: I18nService,
    private readonly languageRepo: LanguagesRepo,
    private readonly translationRepo: TranslationRepository,
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

    const data = await this.achievementGroupRepo.list(
      pagination,
      langId ?? undefined,
      isAdmin
    )
    // Nếu là admin thì chuyển các `nameTranslations` thành chuẩn { key: code, value }
    // Ngược lại (non-admin) thì loại bỏ hoàn toàn trường `nameTranslations` để trả payload nhẹ
    if (data && Array.isArray((data as any).results)) {
      const results = (data as any).results
      if (isAdmin) {
        await Promise.all(
          results.map(async (item: any, idx: number) => {
            const raw = (item as any).nameTranslations || []
            const converted = await this.convertTranslationsToLangCodes(raw)
            ;(data as any).results[idx] = { ...item, nameTranslations: converted }
          })
        )
      } else {
        // remove translations array for non-admin consumers
        for (let i = 0; i < results.length; i++) {
          const { nameTranslations, ...rest } = results[i]
          ;(data as any).results[i] = rest
        }
      }
    }

    return {
      data,
      message: this.i18nService.translate(AchievementGroupMessage.GET_LIST_SUCCESS, lang)
    }
  }

  async findById(id: number, roleName: string, lang: string = 'vi') {
    const langId = await this.languageRepo.getIdByCode(lang)
    const isAdmin = roleName === RoleName.Admin ? true : false

    if (!langId) {
      return {
        data: null,
        message: this.i18nService.translate(AchievementGroupMessage.GET_SUCCESS, lang)
      }
    }

    const achievementGroup = await this.achievementGroupRepo.findByIdWithLangId(
      id,
      isAdmin,
      langId
    )
    if (!achievementGroup) {
      throw new NotFoundRecordException()
    }

    const nameTranslations = await this.convertTranslationsToLangCodes(
      (achievementGroup as any).nameTranslations || []
    )

    const currentTranslation = ((achievementGroup as any).nameTranslations || []).find(
      (t: any) => t.languageId === langId
    )

    // Remove raw nameTranslations from shopBanner
    const { nameTranslations: _, ...leaderboardWithoutTranslations } =
      achievementGroup as any

    const data = {}
    const result = {
      ...leaderboardWithoutTranslations,
      nameTranslation: currentTranslation?.value ?? null,
      ...(isAdmin ? { nameTranslations } : {})
    }

    // Map achievements: keep only current language translation and reward (with current translation).
    const achievements = await Promise.all(
      (achievementGroup.achievements || []).map(async (a: any) => {
        const nameTranslationsConverted = await this.convertTranslationsToLangCodes(
          a.nameTranslations || []
        )
        const descriptionTranslationsConverted =
          await this.convertTranslationsToLangCodes(a.descriptionTranslations || [])
        const conditionTextTranslationsConverted =
          await this.convertTranslationsToLangCodes(a.conditionTextTranslations || [])

        const nameTranslation =
          (a.nameTranslations || []).find((t: any) => t.languageId === langId)?.value ??
          null
        const descriptionTranslation =
          (a.descriptionTranslations || []).find((t: any) => t.languageId === langId)
            ?.value ?? null
        const conditionTextTranslation =
          (a.conditionTextTranslations || []).find((t: any) => t.languageId === langId)
            ?.value ?? null

        const {
          nameTranslations: _nt,
          descriptionTranslations: _dt,
          conditionTextTranslations: _ct,
          ...achievementWithoutTranslations
        } = a
        if (isAdmin) {
          return {
            ...achievementWithoutTranslations,
            nameTranslation,
            descriptionTranslation,
            conditionTextTranslation,
            nameTranslations: nameTranslationsConverted,
            descriptionTranslations: descriptionTranslationsConverted,
            conditionTextTranslations: conditionTextTranslationsConverted
          }
        }

        // non-admin: strip translation fields entirely
        return {
          ...achievementWithoutTranslations
        }
      })
    )

    return {
      statusCode: HttpStatus.OK,
      data: {
        ...result,
        achievements: achievements
      },
      message: this.i18nService.translate(AchievementGroupMessage.GET_SUCCESS, lang)
    }
  }

  async create(
    {
      data,
      createdById
    }: {
      data: CreateAchievementGroupBodyInputType
      createdById: number
    },
    lang: string = 'vi'
  ) {
    let createdAchievementGroup: any = null

    try {
      return await this.achievementGroupRepo.withTransaction(async (prismaTx) => {
        const nameKey = `achievementGroup.name.${Date.now()}`
        let hasOpened = false

        const dataCreate: CreateAchievementGroupBodyType = {
          nameKey,
          displayOrder: data.displayOrder,
          isActive: data.isActive
        }

        createdAchievementGroup = await this.achievementGroupRepo.create(
          {
            createdById,
            data: {
              ...dataCreate
            }
          },
          prismaTx
        )

        // Now we have id, create proper nameKey
        const fNameKey = `achievementGroup.name.${createdAchievementGroup.id}`

        const nameList = data.nameTranslations.map((t) => t.key)

        // Get unique language codes
        const allLangCodes = Array.from(new Set(nameList))

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
        const translationRecords: CreateTranslationBodyType[] = []

        // nameTranslations → key = nameKey
        for (const item of data.nameTranslations) {
          translationRecords.push({
            languageId: langMap[item.key],
            key: fNameKey,
            value: item.value
          })
        }

        // Validate translations (check for duplicate names)
        await this.translationRepo.validateTranslationRecords(translationRecords)

        // Create or update translations with transaction
        // const translationPromises = translationRecords.map((record) =>
        //   this.translationRepo.createOrUpdateWithTransaction(record, prismaTx)
        // )
        // await Promise.all(translationPromises)

        // Update achievementGroup with final nameKey
        const result = await this.achievementGroupRepo.update(
          {
            id: createdAchievementGroup.id,
            data: {
              nameKey: fNameKey,
              nameTranslations: translationRecords,
              achievementGroupNameKey: fNameKey
            }
          },
          prismaTx
        )

        return {
          statusCode: HttpStatus.CREATED,
          data: result,
          message: this.i18nService.translate(
            AchievementGroupMessage.CREATE_SUCCESS,
            lang
          )
        }
      })
    } catch (error) {
      // Rollback: Delete achievementGroup if created
      if (createdAchievementGroup?.id) {
        try {
          await this.achievementGroupRepo.delete(
            {
              id: createdAchievementGroup.id,
              deletedById: createdById
            },
            true
          )
        } catch (rollbackError) {}
      }

      if (isUniqueConstraintPrismaError(error)) {
        throw new AchievementGroupAlreadyExistsException()
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
      data: UpdateAchievementGroupBodyInputType
      updatedById: number
    },
    lang: string = 'vi'
  ) {
    let existingAchievementGroup: any = null

    try {
      return await this.achievementGroupRepo.withTransaction(async (prismaTx) => {
        let hasOpen = false
        let translationRecords: CreateTranslationBodyType[] = []
        // Get current record
        existingAchievementGroup = await this.achievementGroupRepo.findById(id)
        if (!existingAchievementGroup) throw new NotFoundRecordException()

        // Prepare data for update
        const dataUpdate: Partial<UpdateAchievementGroupBodyType> = {}

        if (data.nameTranslations) {
          const nameList = data.nameTranslations.map((t) => t.key)
          const allLangCodes = Array.from(new Set(nameList))

          if (allLangCodes.length > 0) {
            // Get languages
            const languages = await this.languageRepo.getWithListCode(allLangCodes)
            const langMap = Object.fromEntries(languages.map((l) => [l.code, l.id]))

            // Check missing language
            const missingLangs = allLangCodes.filter((code) => !langMap[code])
            if (missingLangs.length > 0) throw new LanguageNotExistToTranslateException()

            // Create translation records
            // const translationRecords: CreateTranslationBodyType[] = []

            // nameTranslations
            for (const t of data.nameTranslations) {
              translationRecords.push({
                languageId: langMap[t.key],
                key: existingAchievementGroup.nameKey,
                value: t.value
              })
            }

            // Validate translation records
            await this.translationRepo.validateTranslationRecords(translationRecords)

            // Update translations with transaction
            // const translationPromises = translationRecords.map((record) =>
            //   this.translationRepo.createOrUpdateWithTransaction(record, prismaTx)
            // )
            // await Promise.all(translationPromises)
          }
        }
        if (data.displayOrder !== undefined) {
          dataUpdate.displayOrder = data.displayOrder
        }
        if (data.isActive !== undefined) {
          dataUpdate.isActive = data.isActive
        }

        // Update AchievementGroup main record
        const updatedAchievementGroup = await this.achievementGroupRepo.update(
          {
            id,
            updatedById,
            data: {
              ...dataUpdate,
              nameTranslations: data.nameTranslations ? translationRecords : [],
              achievementGroupNameKey: existingAchievementGroup.nameKey
            }
          },
          prismaTx
        )

        return {
          statusCode: HttpStatus.OK,
          data: updatedAchievementGroup,
          message: this.i18nService.translate(
            AchievementGroupMessage.UPDATE_SUCCESS,
            lang
          )
        }
      })
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      if (isUniqueConstraintPrismaError(error)) {
        throw new AchievementGroupAlreadyExistsException()
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
      const existingAchievementGroup = await this.achievementGroupRepo.findById(id)
      if (!existingAchievementGroup) {
        throw new NotFoundRecordException()
      }

      await Promise.all([
        this.achievementGroupRepo.delete({
          id,
          deletedById
        }),
        this.translationRepo.deleteByKey(existingAchievementGroup.nameKey)
      ])

      return {
        statusCode: HttpStatus.OK,
        data: null,
        message: this.i18nService.translate(AchievementGroupMessage.DELETE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }
}
