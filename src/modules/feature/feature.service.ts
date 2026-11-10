import { RoleName } from '@/common/constants/role.constant'
import { I18nService } from '@/i18n/i18n.service'
import { FeatureMessage } from '@/i18n/message-keys'
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
import { HttpStatus, Injectable } from '@nestjs/common'
import { LanguagesRepo } from '../languages/languages.repo'
import { CreateTranslationBodyType } from '../translation/entities/translation.entity'
import { TranslationRepo } from '../translation/translation.repo'
import { FeatureAlreadyExistsException } from './dto/feature.error'
import {
  CreateFeatureBodyInputType,
  CreateFeatureBodyType,
  UpdateFeatureBodyInputType,
  UpdateFeatureBodyType
} from './entities/feature.entity'
import { FeatureRepo } from './feature.repo'

@Injectable()
export class FeatureService {
  constructor(
    private featureRepo: FeatureRepo,
    private readonly i18nService: I18nService,
    private readonly languageRepo: LanguagesRepo,
    private readonly translationRepo: TranslationRepo
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

    const data = await this.featureRepo.list(pagination, langId ?? undefined, isAdmin)

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
      message: this.i18nService.translate(FeatureMessage.GET_LIST_SUCCESS, lang)
    }
  }

  async findById(id: number, roleName: string, lang: string = 'vi') {
    const langId = await this.languageRepo.getIdByCode(lang)
    const isAdmin = roleName === RoleName.Admin ? true : false

    if (!langId) {
      return {
        data: null,
        message: this.i18nService.translate(FeatureMessage.GET_SUCCESS, lang)
      }
    }

    const feature = await this.featureRepo.findByIdWithLangId(id, isAdmin, langId)
    if (!feature) {
      throw new NotFoundRecordException()
    }
    const nameTranslations = await this.convertTranslationsToLangCodes(
      (feature as any).nameTranslations || []
    )
    const descriptionTranslations = await this.convertTranslationsToLangCodes(
      (feature as any).descriptionTranslations || []
    )

    const currentNameTranslation = ((feature as any).nameTranslations || []).find(
      (t: any) => t.languageId === langId
    )
    const currentDescriptionTranslation = (
      (feature as any).descriptionTranslations || []
    ).find((t: any) => t.languageId === langId)

    // Chuyển nameTranslations và descriptionTranslations -> chỉ lấy bản dịch hiện tại (current)
    // và loại bỏ top-level `nameTranslations` và `descriptionTranslations` trong `transformed` để tránh trả về
    // trường này cho người dùng non-admin (nếu cần admin sẽ được thêm lại bên dưới)
    const transformed = feature
      ? {
          ...feature,
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
      message: this.i18nService.translate(FeatureMessage.GET_SUCCESS, lang)
    }
  }

  async findByIdWithAllLang(id: number, lang: string = 'vi') {
    const langId = await this.languageRepo.getIdByCode(lang)

    const feature: any = await this.featureRepo.findByIdWithAllLang(id)
    if (!feature) {
      throw new NotFoundRecordException()
    }

    // derive single-language name for current lang if available
    const nameTranslation = langId
      ? (feature.nameTranslations?.find((t: any) => t.languageId === langId)?.value ??
        null)
      : null

    // map array to { key: code, value }
    const languages = await this.languageRepo.getWithListId(
      Array.from(new Set((feature.nameTranslations ?? []).map((t: any) => t.languageId)))
    )
    const codeMap = Object.fromEntries(languages.map((l) => [l.id, l.code]))

    const result = {
      ...feature,
      nameTranslations: (feature.nameTranslations ?? []).map((t: any) => ({
        key: codeMap[t.languageId] ?? String(t.languageId),
        value: t.value
      }))
    }

    return {
      statusCode: HttpStatus.OK,
      data: result,
      message: this.i18nService.translate(FeatureMessage.GET_SUCCESS, lang)
    }
  }

  async create(
    {
      data,
      createdById
    }: {
      data: CreateFeatureBodyInputType
      createdById: number
    },
    lang: string = 'vi'
  ) {
    let createdFeature: any = null

    try {
      return await this.featureRepo.withTransaction(async (prismaTx) => {
        const nameKey = `feature.name.${Date.now()}`

        const dataCreate: CreateFeatureBodyType = {
          nameKey,
          featureKey: data.featureKey
        }

        createdFeature = await this.featureRepo.create(
          {
            createdById,
            data: {
              ...dataCreate
            }
          },
          prismaTx
        )

        // Now we have id, create proper keys
        const fNameKey = `feature.name.${createdFeature.id}`

        // Collect all language codes from both name and description translations
        const nameList = data.nameTranslations.map((t) => t.key)

        // Get unique language codes
        const allLangCodes = Array.from(new Set([...nameList]))

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

        // nameTranslations → key = fNameKey
        for (const item of data.nameTranslations) {
          nameTranslationRecords.push({
            languageId: langMap[item.key],
            key: fNameKey,
            value: item.value
          })
        }

        // Validate translations (check for duplicate names)
        await this.translationRepo.validateTranslationRecords([...nameTranslationRecords])

        // Update feature with final keys and translations
        const result = await this.featureRepo.update(
          {
            id: createdFeature.id,
            data: {
              nameKey: fNameKey,
              nameTranslations: nameTranslationRecords,
              featureNameKey: fNameKey
            }
          },
          prismaTx
        )

        return {
          statusCode: HttpStatus.CREATED,
          data: result,
          message: this.i18nService.translate(FeatureMessage.CREATE_SUCCESS, lang)
        }
      })
    } catch (error) {
      // Rollback: Delete feature if created
      if (createdFeature?.id) {
        try {
          await this.featureRepo.delete(
            {
              id: createdFeature.id,
              deletedById: createdById
            },
            true
          )
        } catch (rollbackError) {}
      }

      if (isUniqueConstraintPrismaError(error)) {
        throw new FeatureAlreadyExistsException()
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
      data: UpdateFeatureBodyInputType
      updatedById: number
    },
    lang: string = 'vi'
  ) {
    let existingFeature: any = null

    try {
      return await this.featureRepo.withTransaction(async (prismaTx) => {
        // Get current record
        existingFeature = await this.featureRepo.findById(id)
        if (!existingFeature) throw new NotFoundRecordException()

        // Prepare data for update
        const dataUpdate: Partial<UpdateFeatureBodyType> = {}

        if (data.featureKey) {
          dataUpdate.featureKey = data.featureKey
        }

        // Handle translations if provided
        let nameTranslationRecords: CreateTranslationBodyType[] = []

        if (data.nameTranslations) {
          const nameList = data.nameTranslations?.map((t) => t.key) || []

          const allLangCodes = Array.from(new Set([...nameList]))

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
                  key: existingFeature.nameKey,
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

        // Update Feature main record
        const updatedFeature = await this.featureRepo.update(
          {
            id,
            updatedById,
            data: {
              ...dataUpdate,
              ...(nameTranslationRecords.length > 0
                ? { nameTranslations: nameTranslationRecords }
                : {}),

              featureNameKey: existingFeature.nameKey
            }
          },
          prismaTx
        )

        return {
          statusCode: HttpStatus.OK,
          data: updatedFeature,
          message: this.i18nService.translate(FeatureMessage.UPDATE_SUCCESS, lang)
        }
      })
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      if (isUniqueConstraintPrismaError(error)) {
        throw new FeatureAlreadyExistsException()
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
      const existingFeature = await this.featureRepo.findById(id)
      if (!existingFeature) {
        throw new NotFoundRecordException()
      }

      await Promise.all([
        this.featureRepo.delete({
          id,
          deletedById
        }),
        this.translationRepo.deleteByKey(existingFeature.nameKey)
      ])

      return {
        statusCode: HttpStatus.OK,
        data: null,
        message: this.i18nService.translate(FeatureMessage.DELETE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }
}
