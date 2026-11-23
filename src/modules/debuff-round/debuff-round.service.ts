import { RoleName } from '@/common/constants/role.constant'
import { LanguagesService } from '@/modules/languages/languages.service'
import { TranslationService } from '@/modules/translation/translation.service'
import {
  LanguageNotExistToTranslateException,
  NotFoundRecordException
} from '@/shared/error'
import {
  isForeignKeyConstraintPrismaError,
  isNotFoundPrismaError,
  isUniqueConstraintPrismaError
} from '@/shared/helpers'
import { PaginationQuery } from '@/shared/models/request.model'
import { Injectable, Logger } from '@nestjs/common'
import { CreateTranslationBody } from '../translation/dto/translation.zod-dto'
import { DebuffRoundRepo } from './debuff-round.repo'
import { DebuffRoundAlreadyExistsException } from './dto/debuff-round.error'
import {
  CreateDebuffRoundBody,
  CreateDebuffRoundBodyInput,
  UpdateDebuffRoundBody,
  UpdateDebuffRoundBodyInput
} from './dto/debuff-round.zod-dto'

@Injectable()
export class DebuffRoundService {
  private readonly logger = new Logger(DebuffRoundService.name)

  constructor(
    private debuffRoundRepo: DebuffRoundRepo,
    private readonly languagesService: LanguagesService,
    private readonly translationService: TranslationService
  ) {}

  private async convertTranslationsToLangCodes(
    nameTranslations: Array<{ languageId: number; value: string }>
  ): Promise<Array<{ key: string; value: string }>> {
    if (!nameTranslations || nameTranslations.length === 0) return []

    const allLangIds = Array.from(new Set(nameTranslations.map((t) => t.languageId)))
    const langs = await this.languagesService.getWithListId(allLangIds)
    const idToCode = new Map(langs.map((l) => [l.id, l.code]))

    return nameTranslations.map((t) => ({
      key: idToCode.get(t.languageId) || String(t.languageId),
      value: t.value
    }))
  }

  async list(pagination: PaginationQuery, lang: string = 'vi', roleName: string) {
    const langId = await this.languagesService.getIdByCode(lang)
    const isAdmin = roleName === RoleName.Admin ? true : false

    if (!langId) {
      return null
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
        ...data,
        results: resultsWithConvertedTranslations
      }
    }

    return data
  }

  async findById(id: number, roleName: string, lang: string = 'vi') {
    const langId = await this.languagesService.getIdByCode(lang)
    const isAdmin = roleName === RoleName.Admin ? true : false

    if (!langId) {
      return null
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

    // Remove raw nameTranslations from shopBanner
    const { nameTranslations: _, ...leaderboardWithoutTranslations } = debuffRound as any

    const data = {}
    const result = {
      ...leaderboardWithoutTranslations,
      nameTranslation: currentTranslation?.value ?? null,
      ...(isAdmin ? { nameTranslations } : {})
    }

    return result
  }

  async create({
    data,
    createdById
  }: {
    data: CreateDebuffRoundBodyInput
    createdById: number
  }) {
    let createdDebuffRound: any = null

    try {
      return await this.debuffRoundRepo.withTransaction(async (prismaTx) => {
        const nameKey = `debuffRound.name.${Date.now()}`

        const dataCreate: CreateDebuffRoundBody = {
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
        const languages = await this.languagesService.getWithListCode(allLangCodes)

        // Create map { code: id } for quick access
        const langMap = Object.fromEntries(languages.map((l) => [l.code, l.id]))

        // Check if any language is missing
        const missingLangs = allLangCodes.filter((code) => !langMap[code])
        if (missingLangs.length > 0) {
          throw new LanguageNotExistToTranslateException()
        }

        // Create translation records
        const translationRecords: CreateTranslationBody[] = []

        // nameTranslations → key = nameKey
        for (const item of data.nameTranslations) {
          translationRecords.push({
            languageId: langMap[item.key],
            key: fNameKey,
            value: item.value
          })
        }

        // Validate translations (check for duplicate names)
        await this.translationService.validateTranslationRecords(translationRecords)

        // Create or update translations with transaction
        // const translationPromises = translationRecords.map((record) =>
        //   this.translationService.createOrUpdateWithTransaction(record, prismaTx)
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

        return result
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

  async update({
    id,
    data,
    updatedById
  }: {
    id: number
    data: UpdateDebuffRoundBodyInput
    updatedById: number
  }) {
    let existingDebuffRound: any = null

    try {
      return await this.debuffRoundRepo.withTransaction(async (prismaTx) => {
        let translationRecords: CreateTranslationBody[] = []
        // Get current record
        existingDebuffRound = await this.debuffRoundRepo.findById(id)
        if (!existingDebuffRound) throw new NotFoundRecordException()

        // Prepare data for update
        const dataUpdate: Partial<UpdateDebuffRoundBody> = {}

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
            const languages = await this.languagesService.getWithListCode(allLangCodes)
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
            await this.translationService.validateTranslationRecords(translationRecords)

            // Update translations with transaction
            // const translationPromises = translationRecords.map((record) =>
            //   this.translationService.createOrUpdateWithTransaction(record, prismaTx)
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

        return updatedDebuffRound
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

  async delete({ id, deletedById }: { id: number; deletedById: number }) {
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
        this.translationService.deleteByKey(existingDebuffRound.nameKey)
      ])

      return
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }

  // ---- For other modules: Debuffs a round can draw (B7) ----

  findLiveDebuffs(...args: Parameters<DebuffRoundRepo['findLiveDebuffs']>) {
    return this.debuffRoundRepo.findLiveDebuffs(...args)
  }
}
