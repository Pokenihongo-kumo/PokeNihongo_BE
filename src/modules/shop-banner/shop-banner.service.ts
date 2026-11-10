import { RoleName } from '@/common/constants/role.constant'
import { ShopBannerStatus } from '@/common/constants/shop-banner.constant'
import { I18nService } from '@/i18n/i18n.service'
import { ShopBannerMessage } from '@/i18n/message-keys'
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
import { LanguagesRepo } from '../languages/languages.repo'
import { PokemonRepo } from '../pokemon/pokemon.repo'
import { ShopItemRepo } from '../shop-item/shop-item.repo'
import { ShopPurchaseRepo } from '../shop-purchase/shop-purchase.repo'
import { CreateTranslationBodyType } from '../translation/entities/translation.entity'
import { TranslationRepo } from '../translation/translation.repo'
import { UserPokemonRepo } from '../user-pokemon/user-pokemon.repo'
import {
  InvalidMinMaxShopBannerException,
  OnlyOneShopBannerActiveException,
  ShopBannerAlreadyExistsException,
  ShopBannerInvalidDateRangeException
} from './dto/shop-bannererror'
import {
  CreateShopBannerBodyInputType,
  CreateShopBannerBodyType,
  UpdateShopBannerBodyInputType,
  UpdateShopBannerBodyType
} from './entities/shop-banner.entity'
import { ShopBannerRepo } from './shop-banner.repo'

@Injectable()
export class ShopBannerService {
  constructor(
    private shopBannerRepo: ShopBannerRepo,
    private readonly i18nService: I18nService,
    private readonly languageRepo: LanguagesRepo,
    private readonly translationRepo: TranslationRepo,
    private readonly shopPurchaseRepo: ShopPurchaseRepo,
    private readonly userPokemonRepo: UserPokemonRepo,
    private readonly pokemonRepo: PokemonRepo,
    private readonly shopItemRepo: ShopItemRepo
  ) {}

  /**
   * Convert nameTranslations from { languageId, value } to { key: langCode, value }
   */
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
    const isAllLang = roleName === RoleName.Admin ? true : false
    const data = await this.shopBannerRepo.list(
      pagination,
      langId ?? undefined,
      isAllLang
    )

    // Convert translations to lang codes for all cases
    const allTranslations = (data.results || []).flatMap(
      (item: any) => item.nameTranslations || []
    )
    console.log('all ne: ', allTranslations)

    if (allTranslations.length === 0) {
      return {
        data,
        message: this.i18nService.translate(ShopBannerMessage.GET_LIST_SUCCESS, lang)
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
      message: this.i18nService.translate(ShopBannerMessage.GET_LIST_SUCCESS, lang)
    }
  }

  async getListAllPokemonWithShopId(
    shopBannerId: number,
    pagination: PaginationQueryType,
    lang: string = 'vi'
  ) {
    // 1. Lấy tất cả pokemon với pagination
    const allPokemon = await this.pokemonRepo.listWithNameNumImg(pagination)

    // 2. Lấy danh sách shop items của banner này (lấy all, không cần pagination)
    const shopItems = await this.shopItemRepo.list({
      currentPage: 1,
      pageSize: 1000, // Lấy đủ để check
      qs: `shopBannerId=${shopBannerId}`
    })

    // 3. Tạo Set chứa các pokemonId đã có trong shop banner
    const existingPokemonIds = new Set(
      shopItems.results.map((item: any) => item.pokemonId)
    )

    // 4. Map qua từng pokemon và thêm field isExist
    const results = allPokemon.results.map((pokemon: any) => ({
      ...pokemon,
      isExist: existingPokemonIds.has(pokemon.id)
    }))

    return {
      statusCode: 200,
      data: {
        ...allPokemon,
        results
      },
      message: this.i18nService.translate(ShopBannerMessage.GET_LIST_SUCCESS, lang)
    }
  }

  async listwithDetail(
    pagination: PaginationQueryType,
    lang: string = 'vi',
    roleName?: string
  ) {
    const langId = await this.languageRepo.getIdByCode(lang)
    const isAllLang = roleName === RoleName.Admin ? true : false
    const data = await this.shopBannerRepo.listwithDetail(
      pagination,
      langId ?? undefined,
      isAllLang
    )

    // Convert translations to lang codes for all cases
    const allTranslations = (data.results || []).flatMap(
      (item: any) => item.nameTranslations || []
    )

    if (allTranslations.length === 0) {
      return {
        data,
        message: this.i18nService.translate(ShopBannerMessage.GET_LIST_SUCCESS, lang)
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

    return {
      data: {
        ...data,
        results
      },
      message: this.i18nService.translate(ShopBannerMessage.GET_LIST_SUCCESS, lang)
    }
  }

  async findById(id: number, lang: string = 'vi', roleName: string) {
    const langId = await this.languageRepo.getIdByCode(lang)

    if (!langId) {
      return {
        data: null,
        message: this.i18nService.translate(ShopBannerMessage.GET_SUCCESS, lang)
      }
    }

    const isAllLang = roleName === RoleName.Admin ? true : false
    console.log('admin ne: ', isAllLang)

    const shopBanner = await this.shopBannerRepo.findByIdWithDetail(id, langId, isAllLang)

    if (!shopBanner) {
      throw new NotFoundRecordException()
    }

    // Convert translations to { key, value } format
    const nameTranslations = await this.convertTranslationsToLangCodes(
      (shopBanner as any).nameTranslations || []
    )
    console.log('sau convert: ', nameTranslations)

    // Find current translation by langId
    const currentTranslation = ((shopBanner as any).nameTranslations || []).find(
      (t: any) => t.languageId === langId
    )

    // Remove raw nameTranslations from shopBanner
    const { nameTranslations: _, ...bannerWithoutTranslations } = shopBanner as any

    const result = {
      ...bannerWithoutTranslations,
      nameTranslation: currentTranslation?.value ?? null,
      ...(isAllLang ? { nameTranslations } : {})
    }
    console.log(`${isAllLang ? nameTranslations : 'ehe'}`)

    return {
      statusCode: HttpStatus.OK,
      data: result,
      message: this.i18nService.translate(ShopBannerMessage.GET_SUCCESS, lang)
    }
  }

  async create(
    {
      data,
      createdById
    }: {
      data: CreateShopBannerBodyInputType
      createdById: number
    },
    lang: string = 'vi'
  ) {
    let createdShopBanner: any = null

    try {
      return await this.shopBannerRepo.withTransaction(async (prismaTx) => {
        if (data.status && data.status === ShopBannerStatus.ACTIVE) {
          // check coi co thang khac active ko
          const isHaveActive = await this.shopBannerRepo.findByStatus(
            ShopBannerStatus.ACTIVE
          )

          if (isHaveActive) {
            throw new OnlyOneShopBannerActiveException()
          }
        }

        const nameKey = `shopBanner.name.${Date.now()}`
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
          throw new ShopBannerInvalidDateRangeException()
        }

        if (data.min && data.max && data.min > data.max) {
          throw new InvalidMinMaxShopBannerException()
        }

        // Convert data for create
        const dataCreate: CreateShopBannerBodyType = {
          nameKey,
          startDate: startDateNormalized,
          endDate: endDateNormalized,
          status: data.status,
          min: data.min,
          max: data.max,
          enablePrecreate: data.enablePrecreate,
          precreateBeforeEndDays: data.precreateBeforeEndDays,
          isRandomItemAgain: data.isRandomItemAgain
        }

        createdShopBanner = await this.shopBannerRepo.create(
          {
            createdById,
            data: dataCreate
          },
          prismaTx
        )

        // Now we have id, create proper nameKey
        const fNameKey = `shopBanner.name.${createdShopBanner.id}`

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

        const result = await this.shopBannerRepo.update(
          {
            id: createdShopBanner.id,
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
          message: this.i18nService.translate(ShopBannerMessage.CREATE_SUCCESS, lang)
        }
      })
    } catch (error) {
      // Rollback: Delete shopBanner if created
      if (createdShopBanner?.id) {
        try {
          await this.shopBannerRepo.delete(
            {
              id: createdShopBanner.id,
              deletedById: createdById
            },
            true
          )
        } catch (rollbackError) {}
      }

      if (isUniqueConstraintPrismaError(error)) {
        throw new ShopBannerAlreadyExistsException()
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
      data: UpdateShopBannerBodyInputType
      updatedById: number
    },
    lang: string = 'vi'
  ) {
    let existingShopBanner: any = null

    try {
      return await this.shopBannerRepo.withTransaction(async (prismaTx) => {
        if (data.status && data.status === ShopBannerStatus.ACTIVE) {
          // check coi co thang khac active ko
          const isHaveActive = await this.shopBannerRepo.findByStatus(
            ShopBannerStatus.ACTIVE
          )

          if (isHaveActive) {
            throw new OnlyOneShopBannerActiveException()
          }
        }
        // Get current record
        existingShopBanner = await this.shopBannerRepo.findById(id)
        if (!existingShopBanner) throw new NotFoundRecordException()

        // Prepare data for update
        const dataUpdate: Partial<UpdateShopBannerBodyType> = {}

        // Normalize dates if provided
        const normalizedStart =
          data.startDate !== undefined
            ? data.startDate === null
              ? null
              : todayUTCWith0000ByDate(data.startDate)
            : (existingShopBanner.startDate as Date | null)
        const normalizedEnd =
          data.endDate !== undefined
            ? data.endDate === null
              ? null
              : todayUTCWith0000ByDate(data.endDate)
            : (existingShopBanner.endDate as Date | null)

        // Validate only when both sides available
        if (normalizedStart && normalizedEnd && normalizedStart > normalizedEnd) {
          throw new ShopBannerInvalidDateRangeException()
        }

        if (data.startDate !== undefined) dataUpdate.startDate = normalizedStart as any
        if (data.endDate !== undefined) dataUpdate.endDate = normalizedEnd as any
        if (data.status !== undefined) dataUpdate.status = data.status

        // Validate min/max against current shop items count
        const currentItemsCount = await this.shopItemRepo.countByShopBannerId(id)
        console.log('current amount: ', currentItemsCount)

        if (data.min !== undefined && data.min !== null) {
          if (currentItemsCount < data.min) {
            throw new InvalidMinMaxShopBannerException()
          }
          dataUpdate.min = data.min
        }

        if (data.max !== undefined && data.max !== null) {
          if (currentItemsCount > data.max) {
            throw new InvalidMinMaxShopBannerException()
          }
          dataUpdate.max = data.max
        }

        if (data.enablePrecreate !== undefined)
          dataUpdate.enablePrecreate = data.enablePrecreate
        if (data.precreateBeforeEndDays !== undefined)
          dataUpdate.precreateBeforeEndDays = data.precreateBeforeEndDays
        if (data.isRandomItemAgain !== undefined)
          dataUpdate.isRandomItemAgain = data.isRandomItemAgain

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
                key: existingShopBanner.nameKey,
                value: t.value
              })
            }
            await this.translationRepo.validateTranslationRecords(translationRecords)

            // Nested upserts for translations
            nameUpserts = (data.nameTranslations ?? []).map((t) => ({
              where: {
                languageId_key: {
                  languageId: (t.key && (langMap as any)[t.key]) as number,
                  key: existingShopBanner.nameKey
                }
              },
              update: { value: t.value },
              create: {
                languageId: (t.key && (langMap as any)[t.key]) as number,
                key: existingShopBanner.nameKey,
                value: t.value
              }
            }))
          }
        }

        // Update ShopBanner main record
        const updatedShopBanner = await this.shopBannerRepo.update(
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
          data: updatedShopBanner,
          message: this.i18nService.translate(ShopBannerMessage.UPDATE_SUCCESS, lang)
        }
      })
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      if (isUniqueConstraintPrismaError(error)) {
        throw new ShopBannerAlreadyExistsException()
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
      const existingShopBanner = await this.shopBannerRepo.findById(id)
      if (!existingShopBanner) {
        throw new NotFoundRecordException()
      }

      await Promise.all([
        this.shopBannerRepo.delete({
          id,
          deletedById
        }),
        this.translationRepo.deleteByKey(existingShopBanner.nameKey)
      ])

      return {
        statusCode: HttpStatus.OK,
        data: null,
        message: this.i18nService.translate(ShopBannerMessage.DELETE_SUCCESS, lang)
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
      console.log(userId)

      const date = todayUTCWith0000()
      const langId = await this.languageRepo.getIdByCode(lang)

      if (!langId) {
        return {
          statusCode: HttpStatus.OK,
          data: null,
          message: this.i18nService.translate(ShopBannerMessage.GET_LIST_SUCCESS, lang)
        }
      }
      console.log('date: ', date)

      const banner = await this.shopBannerRepo.findValidByDateWithLangId(date, langId)

      // If no active banner found
      if (!banner) {
        return {
          statusCode: HttpStatus.OK,
          data: null,
          message: this.i18nService.translate(ShopBannerMessage.GET_LIST_SUCCESS, lang)
        }
      }

      // If we have a userId, compute canBuy per item based on their total purchased quantities
      if (userId) {
        // Collect unique item IDs
        const itemIds = Array.from(
          new Set(((banner as any).shopItems || []).map((i: any) => i.id as number))
        )

        // Fetch totals in parallel
        const totals = await Promise.all(
          itemIds.map(async (itemId: number) => ({
            itemId,
            total: await this.shopPurchaseRepo.getTotalPurchasedQuantityByUserAndItem(
              userId,
              itemId
            )
          }))
        )
        const totalMap = new Map<number, number>(
          totals.map((t) => [t.itemId as number, t.total])
        )

        // Fetch user's owned pokemons
        const userPokemons = await this.userPokemonRepo.getByUserId(userId)
        const ownedPokemonIds = new Set<number>(
          (userPokemons || []).map((up: any) => up.pokemonId)
        )

        // Remove nameTranslations array from banner, keep only nameTranslation
        const { nameTranslations: _, ...bannerData } = banner as any

        // Always sort shopItems by id ascending
        const sortedItems = (((banner as any).shopItems || []) as any[])
          .slice()
          .sort((a: any, b: any) => (a?.id ?? 0) - (b?.id ?? 0))

        const data = {
          ...bannerData,
          shopItems: sortedItems.map((it: any) => {
            // 1. Nếu user đã sở hữu pokemon này → canBuy = false
            const ownsTarget = ownedPokemonIds.has(it.pokemonId)
            if (ownsTarget) {
              return { ...it, canBuy: false }
            }

            // 2. Kiểm tra previousPokemons
            const prevList = it.pokemon?.previousPokemons || []

            // 2a. Nếu previousPokemons là [] (không có tiền nhiệm) → canBuy = true (nếu đủ limit)
            if (prevList.length === 0) {
              const limit = it.purchaseLimit
              const bought = totalMap.get(it.id) ?? 0
              const withinLimit = limit == null ? true : bought < limit
              return { ...it, canBuy: withinLimit }
            }

            // 2b. Nếu có previousPokemons, check xem user có sở hữu ít nhất 1 con trong list không
            const ownsPrev = prevList.some(
              (prev: any) => prev?.id && ownedPokemonIds.has(prev.id)
            )

            // Nếu không sở hữu bất kỳ pokemon tiền nhiệm nào → canBuy = false
            if (!ownsPrev) {
              return { ...it, canBuy: false }
            }

            // 3. Nếu sở hữu pokemon tiền nhiệm, kiểm tra purchase limit
            const limit = it.purchaseLimit
            const bought = totalMap.get(it.id) ?? 0
            const withinLimit = limit == null ? true : bought < limit
            return { ...it, canBuy: withinLimit }
          })
        }

        return {
          statusCode: HttpStatus.OK,
          data,
          message: this.i18nService.translate(ShopBannerMessage.GET_LIST_SUCCESS, lang)
        }
      }

      // No user: default canBuy to true for all items
      // Remove nameTranslations array from banner, keep only nameTranslation
      const { nameTranslations: _, ...bannerData } = banner as any

      // Always sort shopItems by id ascending
      const sortedItems = (((banner as any).shopItems || []) as any[])
        .slice()
        .sort((a: any, b: any) => (a?.id ?? 0) - (b?.id ?? 0))

      const data = {
        ...bannerData,
        shopItems: sortedItems.map((it: any) => ({
          ...it,
          canBuy: true
        }))
      }

      return {
        statusCode: HttpStatus.OK,
        data,
        message: this.i18nService.translate(ShopBannerMessage.GET_LIST_SUCCESS, lang)
      }
    } catch (error) {
      throw error
    }
  }

  async checkActiveShopBanner() {
    const isHaveActive = await this.shopBannerRepo.findByStatus(ShopBannerStatus.ACTIVE)
    return isHaveActive !== null
  }
}
