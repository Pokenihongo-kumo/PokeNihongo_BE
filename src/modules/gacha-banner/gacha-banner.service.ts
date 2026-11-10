import { GachaStarType } from '@/common/constants/gacha.constant'
import { RoleName } from '@/common/constants/role.constant'
import { I18nService } from '@/i18n/i18n.service'
import { GachaBannerMessage } from '@/i18n/message-keys'
import {
  LanguageNotExistToTranslateException,
  NotFoundRecordException
} from '@/shared/error'
import {
  addDaysUTC0000,
  isForeignKeyConstraintPrismaError,
  isNotFoundPrismaError,
  isUniqueConstraintPrismaError,
  todayUTCWith0000,
  todayUTCWith0000ByDate
} from '@/shared/helpers'
import { PaginationQueryType } from '@/shared/models/request.model'
import { HttpStatus, Injectable } from '@nestjs/common'
import { GachaItemRepo } from '../gacha-item/gacha-item.repo'
import { LanguagesRepo } from '../languages/languages.repo'
import { CreateTranslationBodyType } from '../translation/entities/translation.entity'
import { TranslationRepo } from '../translation/translation.repo'
import {
  GachaBannerActiveLimitExceededException,
  GachaBannerAlreadyExistsException,
  GachaBannerInvalidDateRangeException,
  InvalidGachaBannerAmountItemsException
} from './dto/gacha-banner.error'
import {
  CreateGachaBannerBodyInputType,
  CreateGachaBannerBodyType,
  UpdateGachaBannerBodyInputType,
  UpdateGachaBannerBodyType
} from './entities/gacha-banner.entity'
import { GachaBannerRepo } from './gacha-banner.repo'

// Constant: Số lượng banner ACTIVE tối đa được phép
const MAX_ACTIVE_BANNERS = 2

@Injectable()
export class GachaBannerService {
  constructor(
    private gachaBannerRepo: GachaBannerRepo,
    private readonly i18nService: I18nService,
    private readonly languageRepo: LanguagesRepo,
    private readonly translationRepo: TranslationRepo,
    private readonly gachaItemRepo: GachaItemRepo
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
  /**
   * Validate số lượng ACTIVE banners không vượt quá giới hạn
   * @param excludeId - ID của banner cần loại trừ khỏi việc đếm (dùng khi update)
   * @throws GachaBannerActiveLimitExceededException nếu số lượng ACTIVE đã đạt tối đa
   */
  private async validateActiveBannersLimit(excludeId?: number): Promise<void> {
    const activeCount = await this.gachaBannerRepo.countActiveBanners(excludeId)
    if (activeCount >= MAX_ACTIVE_BANNERS) {
      throw new GachaBannerActiveLimitExceededException()
    }
  }

  async list(pagination: PaginationQueryType, lang: string = 'vi', roleName: string) {
    const langId = await this.languageRepo.getIdByCode(lang)

    const isAdmin = roleName === RoleName.Admin ? true : false

    console.log('admin ne: ', isAdmin)

    const data = await this.gachaBannerRepo.list(pagination, langId ?? undefined, isAdmin)
    // Convert translations to lang codes for all cases
    const allTranslations = (data.results || []).flatMap(
      (item: any) => item.nameTranslations || []
    )
    console.log('all ne: ', allTranslations)

    if (allTranslations.length === 0) {
      return {
        data,
        message: this.i18nService.translate(GachaBannerMessage.GET_LIST_SUCCESS, lang)
      }
    }

    const converted = await this.convertTranslationsToLangCodes(allTranslations)

    // Build map for quick lookup
    const conversionMap = new Map(
      allTranslations.map((t, idx) => [`${t.languageId}_${t.value}`, converted[idx]])
    )

    const results = (data.results || []).map((item: any) => {
      const translationsAll = (item.nameTranslations || []).map(
        (t: any) =>
          conversionMap.get(`${t.languageId}_${t.value}`) || {
            key: String(t.languageId),
            value: t.value
          }
      )
      const { nameTranslations, ...rest } = item
      return {
        ...rest,
        nameTranslations: translationsAll
      }
    })
    console.log('results', results)

    return {
      data: {
        ...data,
        results
      },
      message: this.i18nService.translate(GachaBannerMessage.GET_LIST_SUCCESS, lang)
    }
  }

  async listwithDetail(pagination: PaginationQueryType, lang: string = 'vi') {
    const langId = await this.languageRepo.getIdByCode(lang)
    const data = await this.gachaBannerRepo.listwithDetail(
      pagination,
      langId ?? undefined
    )

    // Build languageId -> code map for all translations present
    const allLangIds: number[] = Array.from(
      new Set(
        (data.results || []).flatMap((item: any) =>
          (item.nameTranslations || []).map((t: any) => t.languageId)
        )
      )
    )
    const langs = await this.languageRepo.getWithListId(allLangIds)
    const idToCode = new Map(langs.map((l) => [l.id, l.code]))

    const results = (data.results || []).map((item: any) => {
      const translationsAll = (item.nameTranslations || []).map((t: any) => ({
        key: idToCode.get(t.languageId) || String(t.languageId),
        value: t.value
      }))
      const { nameTranslations, ...rest } = item
      return {
        ...rest,
        nameTranslations: translationsAll
      }
    })

    return {
      data: {
        ...data,
        results
      },
      message: this.i18nService.translate(GachaBannerMessage.GET_LIST_SUCCESS, lang)
    }
  }

  async findById(id: number, lang: string = 'vi', roleName: string) {
    const langId = await this.languageRepo.getIdByCode(lang)
    const isAdmin = roleName === RoleName.Admin ? true : false

    if (!langId) {
      return {
        data: null,
        message: this.i18nService.translate(GachaBannerMessage.GET_SUCCESS, lang)
      }
    }

    const gachaBanner = await this.gachaBannerRepo.findByIdWithLangId(id, langId, isAdmin)
    if (!gachaBanner) {
      throw new NotFoundRecordException()
    }

    // Convert translations to { key, value } format
    const nameTranslations = await this.convertTranslationsToLangCodes(
      (gachaBanner as any).nameTranslations || []
    )

    // Find current translation by langId
    const currentTranslation = ((gachaBanner as any).nameTranslations || []).find(
      (t: any) => t.languageId === langId
    )

    // Remove raw nameTranslations from shopBanner
    const { nameTranslations: _, ...bannerWithoutTranslations } = gachaBanner as any

    // Count items by star type
    const [
      amount5StarCurrent,
      amount4StarCurrent,
      amount3StarCurrent,
      amount2StarCurrent,
      amount1StarCurrent
    ] = await Promise.all([
      this.gachaItemRepo.countItemsByStarType(id, GachaStarType.FIVE),
      this.gachaItemRepo.countItemsByStarType(id, GachaStarType.FOUR),
      this.gachaItemRepo.countItemsByStarType(id, GachaStarType.THREE),
      this.gachaItemRepo.countItemsByStarType(id, GachaStarType.TWO),
      this.gachaItemRepo.countItemsByStarType(id, GachaStarType.ONE)
    ])

    const result = {
      ...bannerWithoutTranslations,
      nameTranslation: currentTranslation?.value ?? null,
      ...(isAdmin ? { nameTranslations } : {}),
      amount5StarCurrent,
      amount4StarCurrent,
      amount3StarCurrent,
      amount2StarCurrent,
      amount1StarCurrent
    }
    console.log(`${isAdmin ? nameTranslations : 'ehe'}`)

    return {
      statusCode: HttpStatus.OK,
      data: result,
      message: this.i18nService.translate(GachaBannerMessage.GET_SUCCESS, lang)
    }
  }

  async create(
    {
      data,
      createdById
    }: {
      data: CreateGachaBannerBodyInputType
      createdById: number
    },
    lang: string = 'vi'
  ) {
    let createdGachaBanner: any = null

    try {
      // Validate ACTIVE banners limit nếu status là ACTIVE
      if (data.status === 'ACTIVE') {
        await this.validateActiveBannersLimit()
      }

      return await this.gachaBannerRepo.withTransaction(async (prismaTx) => {
        const nameKey = `gachaBanner.name.${Date.now()}`
        const now = new Date()

        // Normalize dates to 00:00 UTC and validate range
        const startDateNormalized = data.startDate
          ? todayUTCWith0000ByDate(data.startDate)
          : todayUTCWith0000ByDate(now)
        const endDateNormalized = data.endDate
          ? todayUTCWith0000ByDate(data.endDate)
          : addDaysUTC0000(startDateNormalized, 7)

        console.log('sDate: ' + startDateNormalized + ' eDate: ' + endDateNormalized)

        if (
          startDateNormalized &&
          endDateNormalized &&
          startDateNormalized > endDateNormalized
        ) {
          throw new GachaBannerInvalidDateRangeException()
        }

        // Convert data for create
        const dataCreate: CreateGachaBannerBodyType = {
          nameKey,
          startDate: startDateNormalized,
          endDate: endDateNormalized,
          status: data.status,
          hardPity5Star: data.hardPity5Star ?? 200,
          costRoll: data.costRoll ?? 100,
          enablePrecreate: data.enablePrecreate ?? false,
          precreateBeforeEndDays: data.precreateBeforeEndDays ?? 2,
          isRandomItemAgain: data.isRandomItemAgain ?? false,
          amount5Star: data.amount5Star ?? 1,
          amount4Star: data.amount4Star ?? 3,
          amount3Star: data.amount3Star ?? 6,
          amount2Star: data.amount2Star ?? 8,
          amount1Star: data.amount1Star ?? 10
        }

        createdGachaBanner = await this.gachaBannerRepo.create(
          {
            createdById,
            data: dataCreate
          },
          prismaTx
        )

        // Now we have id, create proper nameKey
        const fNameKey = `gachaBanner.name.${createdGachaBanner.id}`

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

        // Create translation records (for validation only)
        const translationRecords: CreateTranslationBodyType[] = data.nameTranslations.map(
          (item) => ({
            languageId: langMap[item.key],
            key: fNameKey,
            value: item.value
          })
        )

        // Validate translations (check for duplicate names)
        await this.translationRepo.validateTranslationRecords(translationRecords)

        // Build nested upserts for name translations
        const nameUpserts = data.nameTranslations.map((item) => ({
          where: {
            languageId_key: { languageId: langMap[item.key], key: fNameKey }
          },
          update: { value: item.value },
          create: { languageId: langMap[item.key], key: fNameKey, value: item.value }
        }))

        const result = await this.gachaBannerRepo.update(
          {
            id: createdGachaBanner.id,
            data: {
              nameKey: fNameKey,
              ...(nameUpserts.length
                ? { nameTranslations: { upsert: nameUpserts as any } }
                : {})
            } as any
          },
          prismaTx
        )

        return {
          statusCode: HttpStatus.CREATED,
          data: result,
          message: this.i18nService.translate(GachaBannerMessage.CREATE_SUCCESS, lang)
        }
      })
    } catch (error) {
      // Rollback: Delete gachaBanner if created
      if (createdGachaBanner?.id) {
        try {
          await this.gachaBannerRepo.delete(
            {
              id: createdGachaBanner.id,
              deletedById: createdById
            },
            true
          )
        } catch (rollbackError) {}
      }

      if (isUniqueConstraintPrismaError(error)) {
        throw new GachaBannerAlreadyExistsException()
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
      data: UpdateGachaBannerBodyInputType
      updatedById: number
    },
    lang: string = 'vi'
  ) {
    let existingGachaBanner: any = null

    try {
      // Validate ACTIVE banners limit nếu đang update sang ACTIVE
      if (data.status === 'ACTIVE') {
        await this.validateActiveBannersLimit(id)
      }

      return await this.gachaBannerRepo.withTransaction(async (prismaTx) => {
        // Get current record
        existingGachaBanner = await this.gachaBannerRepo.findById(id)
        if (!existingGachaBanner) throw new NotFoundRecordException()

        // Prepare data for update
        const dataUpdate: Partial<UpdateGachaBannerBodyType> = {}

        // Normalize dates if provided
        const normalizedStart =
          data.startDate !== undefined
            ? data.startDate === null
              ? null
              : todayUTCWith0000ByDate(data.startDate)
            : (existingGachaBanner.startDate as Date | null)
        const normalizedEnd =
          data.endDate !== undefined
            ? data.endDate === null
              ? null
              : todayUTCWith0000ByDate(data.endDate)
            : (existingGachaBanner.endDate as Date | null)

        // Validate only when both sides available
        if (normalizedStart && normalizedEnd && normalizedStart > normalizedEnd) {
          throw new GachaBannerInvalidDateRangeException()
        }

        if (data.startDate !== undefined) dataUpdate.startDate = normalizedStart as any
        if (data.endDate !== undefined) dataUpdate.endDate = normalizedEnd as any
        if (data.status !== undefined) dataUpdate.status = data.status
        if (data.hardPity5Star !== undefined)
          dataUpdate.hardPity5Star = data.hardPity5Star
        if (data.costRoll !== undefined) dataUpdate.costRoll = data.costRoll
        if (data.amount5Star !== undefined) dataUpdate.amount5Star = data.amount5Star
        if (data.amount4Star !== undefined) dataUpdate.amount4Star = data.amount4Star
        if (data.amount3Star !== undefined) dataUpdate.amount3Star = data.amount3Star
        if (data.amount2Star !== undefined) dataUpdate.amount2Star = data.amount2Star
        if (data.amount1Star !== undefined) dataUpdate.amount1Star = data.amount1Star
        if (data.enablePrecreate !== undefined)
          dataUpdate.enablePrecreate = data.enablePrecreate
        if (data.precreateBeforeEndDays !== undefined)
          dataUpdate.precreateBeforeEndDays = data.precreateBeforeEndDays
        if (data.isRandomItemAgain !== undefined)
          dataUpdate.isRandomItemAgain = data.isRandomItemAgain

        // Check so sanh xem neu amount co chinh thi co hop le khong
        const promises: Promise<any>[] = []

        if (data.amount5Star !== undefined) {
          promises.push(
            this.gachaItemRepo
              .countItemsByStarType(existingGachaBanner.id, GachaStarType.FIVE)
              .then((result) => ({
                amount5Star: result
              }))
          )
        }

        if (data.amount4Star !== undefined) {
          promises.push(
            this.gachaItemRepo
              .countItemsByStarType(existingGachaBanner.id, GachaStarType.FOUR)
              .then((result) => ({
                amount4Star: result
              }))
          )
        }

        if (data.amount3Star !== undefined) {
          promises.push(
            this.gachaItemRepo
              .countItemsByStarType(existingGachaBanner.id, GachaStarType.THREE)
              .then((result) => ({
                amount3Star: result
              }))
          )
        }

        if (data.amount2Star !== undefined) {
          promises.push(
            this.gachaItemRepo
              .countItemsByStarType(existingGachaBanner.id, GachaStarType.TWO)
              .then((result) => ({
                amount2Star: result
              }))
          )
        }

        if (data.amount1Star !== undefined) {
          promises.push(
            this.gachaItemRepo
              .countItemsByStarType(existingGachaBanner.id, GachaStarType.ONE)
              .then((result) => ({
                amount1Star: result
              }))
          )
        }

        // chạy tất cả so sánh
        const checkamountStar = await Promise.all(promises)
        for (const item of checkamountStar) {
          const key = Object.keys(item)[0]
          const value = (item as any)[key]
          if (dataUpdate[key] !== undefined && value > dataUpdate[key]) {
            throw new InvalidGachaBannerAmountItemsException(
              `${key}: ${value} > ${dataUpdate[key]}`
            )
          }
        }

        // Handle translations if provided
        let nameUpserts: any[] = []
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

            // Create translation records for validation
            const translationRecords: CreateTranslationBodyType[] = []
            for (const t of data.nameTranslations) {
              translationRecords.push({
                languageId: langMap[t.key],
                key: existingGachaBanner.nameKey,
                value: t.value
              })
            }
            await this.translationRepo.validateTranslationRecords(translationRecords)

            // Nested upserts for translations
            nameUpserts = (data.nameTranslations ?? []).map((t) => ({
              where: {
                languageId_key: {
                  languageId: (t.key && (langMap as any)[t.key]) as number,
                  key: existingGachaBanner.nameKey
                }
              },
              update: { value: t.value },
              create: {
                languageId: (t.key && (langMap as any)[t.key]) as number,
                key: existingGachaBanner.nameKey,
                value: t.value
              }
            }))
          }
        }

        // Update GachaBanner main record
        const updatedGachaBanner = await this.gachaBannerRepo.update(
          {
            id,
            updatedById,
            data: {
              ...dataUpdate,
              ...(nameUpserts.length
                ? { nameTranslations: { upsert: nameUpserts as any } }
                : {})
            } as any
          },
          prismaTx
        )

        return {
          statusCode: HttpStatus.OK,
          data: updatedGachaBanner,
          message: this.i18nService.translate(GachaBannerMessage.UPDATE_SUCCESS, lang)
        }
      })
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      if (isUniqueConstraintPrismaError(error)) {
        throw new GachaBannerAlreadyExistsException()
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
      const existingGachaBanner = await this.gachaBannerRepo.findById(id)
      if (!existingGachaBanner) {
        throw new NotFoundRecordException()
      }

      await Promise.all([
        this.gachaBannerRepo.delete({
          id,
          deletedById
        }),
        this.translationRepo.deleteByKey(existingGachaBanner.nameKey)
      ])

      return {
        statusCode: HttpStatus.OK,
        data: null,
        message: this.i18nService.translate(GachaBannerMessage.DELETE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }

  async getByToday(lang: string = 'vi', userId?: number) {
    try {
      const date = todayUTCWith0000()
      const langId = await this.languageRepo.getIdByCode(lang)

      if (!langId) {
        return {
          statusCode: HttpStatus.OK,
          data: [],
          message: this.i18nService.translate(GachaBannerMessage.GET_LIST_SUCCESS, lang)
        }
      }

      // Lấy tất cả gacha banners có status = ACTIVE và trong khoảng thời gian hợp lệ
      const banners = await this.gachaBannerRepo.findValidByDateWithLangId(date, langId)
      const rarityOrder = ['FIVE', 'FOUR', 'THREE', 'TWO', 'ONE'] as const

      // Attach the first available pokemon (by rarity order) into each banner
      const enrichedBanners = (banners || []).map((banner: any) => {
        let chosen: any = null
        for (const star of rarityOrder) {
          const item = (banner.items || []).find(
            (it: any) => it?.gachaItemRate?.starType === star
          )
          if (item && item.pokemon) {
            const p = item.pokemon
            chosen = {
              id: p.id,
              nameJp: p.nameJp,
              nameTranslations: p.nameTranslations,
              imageUrl: p.imageUrl,
              rarity: p.rarity,
              starType: star,
              pokedex_number: p.pokedex_number
            }
            break
          }
        }
        const { items, gachaItemRate, nameTranslations, ...bannerWithoutItems } = banner
        // console.log(bannerWithoutItems)

        return {
          ...bannerWithoutItems,
          pokemon: chosen
        }
      })
      // console.log(enrichedBanners)

      return {
        statusCode: HttpStatus.OK,
        data: enrichedBanners,
        message: this.i18nService.translate(GachaBannerMessage.GET_LIST_SUCCESS, lang)
      }
    } catch (error) {
      throw error
    }
  }
}
