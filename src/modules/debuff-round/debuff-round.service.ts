import { RoleName } from '@/common/constants/role.constant'
import { I18nService } from '@/i18n/i18n.service'
import { DebuffRoundMessage } from '@/i18n/message-keys'
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
import { DebuffRoundRepo } from './debuff-round.repo'
import { DebuffRoundAlreadyExistsException } from './dto/debuff-round.error'
import {
  CreateDebuffRoundBodyInputType,
  CreateDebuffRoundBodyType,
  UpdateDebuffRoundBodyInputType,
  UpdateDebuffRoundBodyType
} from './entities/debuff-round.entity'

@Injectable()
export class DebuffRoundService {
  constructor(
    private debuffRoundRepo: DebuffRoundRepo,
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

    if (!langId) {
      return {
        data: null,
        message: this.i18nService.translate(DebuffRoundMessage.GET_LIST_SUCCESS, lang)
      }
    }

    const data = await this.debuffRoundRepo.list(pagination, langId ?? undefined, isAdmin)

    // Convert nameTranslations cho từng item trong results
    if (data.results && Array.isArray(data.results)) {
      const resultsWithConvertedTranslations = await Promise.all(
        data.results.map(async (item: any) => {
          if (item.nameTranslations && Array.isArray(item.nameTranslations)) {
            const convertedTranslations = await this.convertTranslationsToLangCodes(
              item.nameTranslations
            )
            return {
              ...item,
              nameTranslations: convertedTranslations
            }
          }
          return item
        })
      )

      return {
        data: {
          ...data,
          results: resultsWithConvertedTranslations
        },
        message: this.i18nService.translate(DebuffRoundMessage.GET_LIST_SUCCESS, lang)
      }
    }

    return {
      data,
      message: this.i18nService.translate(DebuffRoundMessage.GET_LIST_SUCCESS, lang)
    }
  }

  async findById(id: number, roleName: string, lang: string = 'vi') {
    const langId = await this.languageRepo.getIdByCode(lang)
    const isAdmin = roleName === RoleName.Admin ? true : false

    if (!langId) {
      return {
        data: null,
        message: this.i18nService.translate(DebuffRoundMessage.GET_SUCCESS, lang)
      }
    }

    const debuffRound = await this.debuffRoundRepo.findByIdWithLangId(id, isAdmin, langId)
    if (!debuffRound) {
      throw new NotFoundRecordException()
    }

    const nameTranslations = await this.convertTranslationsToLangCodes(
      (debuffRound as any).nameTranslations || []
    )

    const currentTranslation = ((debuffRound as any).nameTranslations || []).find(
      (t: any) => t.languageId === langId
    )
    console.log(nameTranslations)

    // Remove raw nameTranslations from shopBanner
    const { nameTranslations: _, ...leaderboardWithoutTranslations } = debuffRound as any

    const data = {}
    const result = {
      ...leaderboardWithoutTranslations,
      nameTranslation: currentTranslation?.value ?? null,
      ...(isAdmin ? { nameTranslations } : {})
    }

    return {
      statusCode: HttpStatus.OK,
      data: result,
      message: this.i18nService.translate(DebuffRoundMessage.GET_SUCCESS, lang)
    }
  }

  async create(
    {
      data,
      createdById
    }: {
      data: CreateDebuffRoundBodyInputType
      createdById: number
    },
    lang: string = 'vi'
  ) {
    let createdDebuffRound: any = null

    try {
      return await this.debuffRoundRepo.withTransaction(async (prismaTx) => {
        const nameKey = `debuffRound.name.${Date.now()}`

        const dataCreate: CreateDebuffRoundBodyType = {
          nameKey,
          typeDebuff: data.typeDebuff,
          valueDebuff: data.valueDebuff
        }

        createdDebuffRound = await this.debuffRoundRepo.create(
          {
            createdById,
            data: dataCreate
          },
          prismaTx
        )

        // Now we have id, create proper nameKey
        const fNameKey = `debuffRound.name.${createdDebuffRound.id}`

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

        // Update debuffRound with final nameKey
        const result = await this.debuffRoundRepo.update(
          {
            id: createdDebuffRound.id,
            data: {
              nameKey: fNameKey,
              nameTranslations: translationRecords,
              debuffRoundNameKey: fNameKey
            }
          },
          prismaTx
        )

        return {
          statusCode: HttpStatus.CREATED,
          data: result,
          message: this.i18nService.translate(DebuffRoundMessage.CREATE_SUCCESS, lang)
        }
      })
    } catch (error) {
      // Rollback: Delete debuffRound if created
      if (createdDebuffRound?.id) {
        try {
          await this.debuffRoundRepo.delete(
            {
              id: createdDebuffRound.id,
              deletedById: createdById
            },
            true
          )
        } catch (rollbackError) {}
      }

      if (isUniqueConstraintPrismaError(error)) {
        throw new DebuffRoundAlreadyExistsException()
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
      data: UpdateDebuffRoundBodyInputType
      updatedById: number
    },
    lang: string = 'vi'
  ) {
    let existingDebuffRound: any = null

    try {
      return await this.debuffRoundRepo.withTransaction(async (prismaTx) => {
        let translationRecords: CreateTranslationBodyType[] = []
        // Get current record
        existingDebuffRound = await this.debuffRoundRepo.findById(id)
        if (!existingDebuffRound) throw new NotFoundRecordException()

        // Prepare data for update
        const dataUpdate: Partial<UpdateDebuffRoundBodyType> = {}

        if (data.typeDebuff !== undefined) {
          dataUpdate.typeDebuff = data.typeDebuff
        }
        if (data.valueDebuff !== undefined) {
          dataUpdate.valueDebuff = data.valueDebuff
        }

        // Handle translations if provided
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
                key: existingDebuffRound.nameKey,
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

        // Update DebuffRound main record
        const updatedDebuffRound = await this.debuffRoundRepo.update(
          {
            id,
            updatedById,
            data: {
              ...dataUpdate,
              nameTranslations: data.nameTranslations ? translationRecords : [],
              debuffRoundNameKey: existingDebuffRound.nameKey
            }
          },
          prismaTx
        )

        return {
          statusCode: HttpStatus.OK,
          data: updatedDebuffRound,
          message: this.i18nService.translate(DebuffRoundMessage.UPDATE_SUCCESS, lang)
        }
      })
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      if (isUniqueConstraintPrismaError(error)) {
        throw new DebuffRoundAlreadyExistsException()
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
      const existingDebuffRound = await this.debuffRoundRepo.findById(id)
      if (!existingDebuffRound) {
        throw new NotFoundRecordException()
      }

      await Promise.all([
        this.debuffRoundRepo.delete({
          id,
          deletedById
        }),
        this.translationRepo.deleteByKey(existingDebuffRound.nameKey)
      ])

      return {
        statusCode: HttpStatus.OK,
        data: null,
        message: this.i18nService.translate(DebuffRoundMessage.DELETE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }
}
