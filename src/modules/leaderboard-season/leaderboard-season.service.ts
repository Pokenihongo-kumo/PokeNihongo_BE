import { RoleName } from '@/common/constants/role.constant'
import { I18nService } from '@/i18n/i18n.service'
import { LeaderboardSeasonMessage } from '@/i18n/message-keys'
import {
  LanguageNotExistToTranslateException,
  NotFoundRecordException
} from '@/shared/error'
import {
  addDaysUTC0000,
  convertEloToRank,
  isForeignKeyConstraintPrismaError,
  isNotFoundPrismaError,
  isUniqueConstraintPrismaError,
  todayUTCWith0000
} from '@/shared/helpers'
import { PaginationQueryType } from '@/shared/models/request.model'
import { PrismaService } from '@/shared/services/prisma.service'
import { HttpStatus, Injectable } from '@nestjs/common'
import { LanguagesRepo } from '../languages/languages.repo'
import { CreateTranslationBodyType } from '../translation/entities/translation.entities'
import { TranslationRepository } from '../translation/translation.repo'
import {
  LeaderboardSeasonAlreadyExistsException,
  LeaderboardSeasonHasActiveException,
  LeaderboardSeasonHasInvalidToActiveException,
  LeaderboardSeasonHasOpenedException
} from './dto/leaderboard-season.error'
import {
  CreateLeaderboardSeasonBodyInputType,
  CreateLeaderboardSeasonBodyType,
  UpdateLeaderboardSeasonBodyInputType,
  UpdateLeaderboardSeasonBodyType
} from './entities/leaderboard-season.entity'
import { LeaderboardSeasonRepo } from './leaderboard-season.repo'

@Injectable()
export class LeaderboardSeasonService {
  constructor(
    private leaderboardSeasonRepo: LeaderboardSeasonRepo,
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

    const data = await this.leaderboardSeasonRepo.list(
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
      message: this.i18nService.translate(LeaderboardSeasonMessage.GET_LIST_SUCCESS, lang)
    }
  }

  async findById(id: number, roleName: string, lang: string = 'vi') {
    const langId = await this.languageRepo.getIdByCode(lang)
    const isAdmin = roleName === RoleName.Admin ? true : false

    if (!langId) {
      return {
        data: null,
        message: this.i18nService.translate(LeaderboardSeasonMessage.GET_SUCCESS, lang)
      }
    }

    const leaderboardSeason = await this.leaderboardSeasonRepo.findByIdWithLangId(
      id,
      isAdmin,
      langId
    )
    if (!leaderboardSeason) {
      throw new NotFoundRecordException()
    }
    const nameTranslations = await this.convertTranslationsToLangCodes(
      (leaderboardSeason as any).nameTranslations || []
    )

    const currentTranslation = ((leaderboardSeason as any).nameTranslations || []).find(
      (t: any) => t.languageId === langId
    )

    // Chuyển nameTranslations của rewards -> chỉ lấy bản dịch hiện tại (current)
    // và loại bỏ top-level `nameTranslations` trong `transformed` để tránh trả về
    // trường này cho người dùng non-admin (nếu cần admin sẽ được thêm lại bên dưới)
    const transformed = leaderboardSeason
      ? {
          ...leaderboardSeason,
          // remove top-level translations to avoid leaking for non-admin
          nameTranslations: undefined,
          seasonRankRewards: (leaderboardSeason as any).seasonRankRewards?.map(
            (sr: any) => ({
              ...sr,
              rewards: (sr.rewards || []).map((r: any) => ({
                ...r,
                nameTranslation:
                  ((r.nameTranslations || []).find((t: any) => t.languageId === langId)
                    ?.value as string) ?? null,
                nameTranslations: undefined
              }))
            })
          )
        }
      : null

    return {
      statusCode: HttpStatus.OK,
      data: {
        ...transformed,
        nameTranslation: currentTranslation?.value ?? null,
        ...(isAdmin ? { nameTranslations } : {})
      },
      message: this.i18nService.translate(LeaderboardSeasonMessage.GET_SUCCESS, lang)
    }
  }

  async findByIdWithAllLang(id: number, lang: string = 'vi') {
    const langId = await this.languageRepo.getIdByCode(lang)

    const leaderboardSeason: any =
      await this.leaderboardSeasonRepo.findByIdWithAllLang(id)
    if (!leaderboardSeason) {
      throw new NotFoundRecordException()
    }

    // derive single-language name for current lang if available
    const nameTranslation = langId
      ? (leaderboardSeason.nameTranslations?.find((t: any) => t.languageId === langId)
          ?.value ?? null)
      : null

    // map array to { key: code, value }
    const languages = await this.languageRepo.getWithListId(
      Array.from(
        new Set((leaderboardSeason.nameTranslations ?? []).map((t: any) => t.languageId))
      )
    )
    const codeMap = Object.fromEntries(languages.map((l) => [l.id, l.code]))

    const result = {
      ...leaderboardSeason,
      nameTranslations: (leaderboardSeason.nameTranslations ?? []).map((t: any) => ({
        key: codeMap[t.languageId] ?? String(t.languageId),
        value: t.value
      }))
    }

    return {
      statusCode: HttpStatus.OK,
      data: result,
      message: this.i18nService.translate(LeaderboardSeasonMessage.GET_SUCCESS, lang)
    }
  }

  async create(
    {
      data,
      createdById
    }: {
      data: CreateLeaderboardSeasonBodyInputType
      createdById: number
    },
    lang: string = 'vi'
  ) {
    let createdLeaderboardSeason: any = null

    try {
      return await this.leaderboardSeasonRepo.withTransaction(async (prismaTx) => {
        const nameKey = `leaderboardSeason.name.${Date.now()}`
        let hasOpened = false
        //check xem neu active xem co active nao khac ko
        if (data.status === 'ACTIVE') {
          hasOpened = true
          const activeSeason = await this.leaderboardSeasonRepo.findActiveSeason()
          if (activeSeason) {
            throw new LeaderboardSeasonHasActiveException()
          }
        }

        const startDateUtc = data.startDate
          ? addDaysUTC0000(data.startDate, 0)
          : todayUTCWith0000()
        const endDateUtc = data.endDate
          ? addDaysUTC0000(data.endDate, 0)
          : addDaysUTC0000(startDateUtc, 30)
        // Convert data for create
        const now = todayUTCWith0000()
        const dataCreate: CreateLeaderboardSeasonBodyType = {
          nameKey,
          startDate: startDateUtc,
          endDate: endDateUtc,
          status: data.status,
          enablePrecreate: data.enablePrecreate,
          precreateBeforeEndDays: data.precreateBeforeEndDays,
          isRandomItemAgain: data.isRandomItemAgain
        }

        createdLeaderboardSeason = await this.leaderboardSeasonRepo.create(
          {
            createdById,
            data: {
              ...dataCreate,
              hasOpened
            }
          },
          prismaTx
        )

        // Now we have id, create proper nameKey
        const fNameKey = `leaderboardSeason.name.${createdLeaderboardSeason.id}`

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

        // Update leaderboardSeason with final nameKey
        const result = await this.leaderboardSeasonRepo.update(
          {
            id: createdLeaderboardSeason.id,
            data: {
              nameKey: fNameKey,
              nameTranslations: translationRecords,
              leaderboardSeasonNameKey: fNameKey,
              hasOpened: hasOpened
            }
          },
          prismaTx
        )

        return {
          statusCode: HttpStatus.CREATED,
          data: result,
          message: this.i18nService.translate(
            LeaderboardSeasonMessage.CREATE_SUCCESS,
            lang
          )
        }
      })
    } catch (error) {
      // Rollback: Delete leaderboardSeason if created
      if (createdLeaderboardSeason?.id) {
        try {
          await this.leaderboardSeasonRepo.delete(
            {
              id: createdLeaderboardSeason.id,
              deletedById: createdById
            },
            true
          )
        } catch (rollbackError) {}
      }

      if (isUniqueConstraintPrismaError(error)) {
        throw new LeaderboardSeasonAlreadyExistsException()
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
      data: UpdateLeaderboardSeasonBodyInputType
      updatedById: number
    },
    lang: string = 'vi'
  ) {
    let existingLeaderboardSeason: any = null

    try {
      return await this.leaderboardSeasonRepo.withTransaction(async (prismaTx) => {
        let hasOpen = false
        let translationRecords: CreateTranslationBodyType[] = []
        // Get current record
        existingLeaderboardSeason = await this.leaderboardSeasonRepo.findById(id)
        if (!existingLeaderboardSeason) throw new NotFoundRecordException()

        // Prepare data for update
        const dataUpdate: Partial<UpdateLeaderboardSeasonBodyType> = {}

        if (data.startDate) {
          dataUpdate.startDate = addDaysUTC0000(data.startDate, 0)
        }
        if (data.endDate) {
          dataUpdate.endDate = addDaysUTC0000(data.endDate, 0)
        }
        if (data.enablePrecreate !== undefined)
          dataUpdate.enablePrecreate = data.enablePrecreate
        if (data.precreateBeforeEndDays !== undefined)
          dataUpdate.precreateBeforeEndDays = data.precreateBeforeEndDays
        if (data.isRandomItemAgain !== undefined)
          dataUpdate.isRandomItemAgain = data.isRandomItemAgain
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
                key: existingLeaderboardSeason.nameKey,
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
        if (data.status) {
          // nếu status là active: check xem có cái nào khác đang active không, nếu có thì không cho
          // nếu nếu không thì: kiểm tra xem date có hợp lệ không
          // và giải này đã từng mở chưa, nếu rồi thì ko cho chỉnh sửa
          if (data.status === 'ACTIVE') {
            const activeSeason = await this.leaderboardSeasonRepo.findActiveSeason()
            if (activeSeason && activeSeason.id !== id) {
              throw new LeaderboardSeasonHasActiveException()
            }
            const now = todayUTCWith0000()
            const startDateUtc = dataUpdate.startDate
              ? dataUpdate.startDate
              : existingLeaderboardSeason.startDate
            const endDateUtc = dataUpdate.endDate
              ? dataUpdate.endDate
              : existingLeaderboardSeason.endDate
            if (!(startDateUtc <= now && endDateUtc >= now)) {
              throw new LeaderboardSeasonHasInvalidToActiveException()
            }
            hasOpen = true
          }
        }
        if (existingLeaderboardSeason.hasOpened === true) {
          throw new LeaderboardSeasonHasOpenedException()
        }

        // Update LeaderboardSeason main record
        const updatedLeaderboardSeason = await this.leaderboardSeasonRepo.update(
          {
            id,
            updatedById,
            data: {
              ...dataUpdate,
              nameTranslations: data.nameTranslations ? translationRecords : [],
              leaderboardSeasonNameKey: existingLeaderboardSeason.nameKey,
              hasOpened: hasOpen
            }
          },
          prismaTx
        )

        return {
          statusCode: HttpStatus.OK,
          data: updatedLeaderboardSeason,
          message: this.i18nService.translate(
            LeaderboardSeasonMessage.UPDATE_SUCCESS,
            lang
          )
        }
      })
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      if (isUniqueConstraintPrismaError(error)) {
        throw new LeaderboardSeasonAlreadyExistsException()
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
      const existingLeaderboardSeason = await this.leaderboardSeasonRepo.findById(id)
      if (!existingLeaderboardSeason) {
        throw new NotFoundRecordException()
      }

      await Promise.all([
        this.leaderboardSeasonRepo.delete({
          id,
          deletedById
        }),
        this.translationRepo.deleteByKey(existingLeaderboardSeason.nameKey)
      ])

      return {
        statusCode: HttpStatus.OK,
        data: null,
        message: this.i18nService.translate(LeaderboardSeasonMessage.DELETE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }

  async getListRankByLeaderboard({
    id,
    lang = 'vi',
    userId,
    rankName,
    pagination
  }: {
    id: number | undefined
    lang?: string
    userId: number
    rankName: string | undefined
    pagination: PaginationQueryType
  }) {
    const currentPage = pagination.currentPage || 1
    const pageSize = pagination.pageSize || 20
    const skip = (currentPage - 1) * pageSize
    const take = pageSize

    // Determine season: use provided id, else active season, else fallback to most recent
    let season: any = null
    if (id) {
      season = await this.leaderboardSeasonRepo.findById(id)
    } else {
      season = await this.leaderboardSeasonRepo.findActiveSeason()
      if (!season) {
        // fallback to most recent by endDate
        season = await this.prismaService.leaderboardSeason.findFirst({
          where: { deletedAt: null },
          orderBy: { endDate: 'desc' }
        })
      }
    }

    if (!season) {
      throw new NotFoundRecordException()
    }

    const seasonId = season.id
    const isActiveSeason = season.status === 'ACTIVE'

    // Define rank thresholds (keep in sync with convertEloToRank)
    const rankThresholds = [
      { rank: 'N5', minElo: 0, maxElo: 1000 },
      { rank: 'N4', minElo: 1001, maxElo: 2000 },
      { rank: 'N3', minElo: 2001, maxElo: 3000 }
    ]

    let eloFilter: any = undefined
    if (rankName) {
      const found = rankThresholds.find((r) => r.rank === rankName)
      if (found) {
        eloFilter = { gte: found.minElo, lte: found.maxElo }
      } else {
        // unknown rankName -> return empty
        return {
          statusCode: HttpStatus.OK,
          data: { top: [], me: null },
          message: this.i18nService.translate(
            LeaderboardSeasonMessage.GET_LIST_SUCCESS,
            lang
          )
        }
      }
    }

    let topMapped: any[] = []
    let me: any = null
    let totalItems = 0

    if (isActiveSeason) {
      // Mùa hiện tại: dùng User.eloscore (chưa finalize)
      // Build where for users
      const whereUsers: any = { deletedAt: null }
      if (eloFilter) whereUsers.eloscore = eloFilter

      // Count total items matching filter
      totalItems = await this.prismaService.user.count({ where: whereUsers })

      // Query top users by eloscore (secondary sort by id for stability)
      const topUsers = await this.prismaService.user.findMany({
        where: whereUsers,
        orderBy: [{ eloscore: 'desc' }, { name: 'asc' }],
        skip,
        take,
        select: {
          id: true,
          name: true,
          avatar: true,
          eloscore: true
        }
      })

      topMapped = topUsers.map((u: any, idx: number) => ({
        position: skip + idx + 1,
        userId: u.id,
        name: u.name ?? null,
        avatar: u.avatar ?? null,
        finalElo: u.eloscore,
        finalRank: convertEloToRank(u.eloscore)
      }))

      // Compute 'me' record
      const myUser = await this.prismaService.user.findUnique({
        where: { id: userId, deletedAt: null },
        select: { id: true, name: true, avatar: true, eloscore: true }
      })

      if (myUser) {
        // Check if user matches rankName filter (if provided)
        const myRank = convertEloToRank(myUser.eloscore)
        const matchesFilter = !rankName || myRank === rankName

        if (matchesFilter) {
          // Count users with same filter and higher elo, or same elo but lower id
          const higherCount = await this.prismaService.user.count({
            where: {
              deletedAt: null,
              ...(eloFilter ? { eloscore: eloFilter } : {}),
              OR: [
                { eloscore: { gt: myUser.eloscore } },
                {
                  eloscore: myUser.eloscore,
                  id: { lt: myUser.id }
                }
              ]
            }
          })

          me = {
            position: higherCount + 1,
            userId: myUser.id,
            name: myUser.name ?? null,
            avatar: myUser.avatar ?? null,
            finalElo: myUser.eloscore,
            finalRank: myRank
          }
        }
      }
    } else {
      // Mùa đã kết thúc: dùng UserSeasonHistory.finalElo
      const whereTop: any = { seasonId, deletedAt: null }
      if (eloFilter) whereTop.finalElo = eloFilter

      // Count total items matching filter
      totalItems = await this.prismaService.userSeasonHistory.count({ where: whereTop })

      // Query top records (secondary sort by userId for stability)
      const top = await this.prismaService.userSeasonHistory.findMany({
        where: whereTop,
        orderBy: [{ finalElo: 'desc' }, { userId: 'asc' }],
        skip,
        take,
        include: {
          user: { select: { id: true, name: true, avatar: true } }
        }
      })

      topMapped = top.map((h: any, idx: number) => ({
        position: skip + idx + 1,
        userId: h.userId,
        name: h.user?.name ?? null,
        avatar: h.user?.avatar ?? null,
        finalElo: h.finalElo,
        finalRank: h.finalRank
      }))

      // Compute 'me' record
      const myHist = await this.prismaService.userSeasonHistory.findFirst({
        where: { seasonId, userId, deletedAt: null },
        include: { user: { select: { id: true, name: true, avatar: true } } }
      })

      if (myHist && myHist.finalElo !== null) {
        // Check if user matches rankName filter (if provided)
        const matchesFilter = !rankName || myHist.finalRank === rankName

        if (matchesFilter) {
          // Count higher records with same filter
          const higherCount = await this.prismaService.userSeasonHistory.count({
            where: {
              seasonId,
              deletedAt: null,
              ...(eloFilter ? { finalElo: eloFilter } : {}),
              OR: [
                { finalElo: { gt: myHist.finalElo } },
                {
                  finalElo: myHist.finalElo,
                  userId: { lt: myHist.userId }
                }
              ]
            }
          })

          me = {
            position: higherCount + 1,
            userId: myHist.userId,
            name: myHist.user?.name ?? null,
            avatar: myHist.user?.avatar ?? null,
            finalElo: myHist.finalElo,
            finalRank: myHist.finalRank
          }
        }
      }
    }

    return {
      statusCode: HttpStatus.OK,
      data: {
        results: topMapped,
        pagination: {
          current: currentPage,
          pageSize,
          totalPage: Math.ceil(totalItems / pageSize),
          totalItem: totalItems
        },
        me
      },
      message: this.i18nService.translate(LeaderboardSeasonMessage.GET_LIST_SUCCESS, lang)
    }
  }

  async getRewardLeaderboardSeasonNow(roleName: string, lang: string) {
    const langId = await this.languageRepo.getIdByCode(lang)
    if (!langId) {
      throw new LanguageNotExistToTranslateException()
    }
    const isAdmin = roleName === RoleName.Admin ? true : false
    const inforLeaderboardWithRewards =
      await this.leaderboardSeasonRepo.findLeaderboardSeasonNowWithRewards(
        langId,
        isAdmin
      )
    const nameTranslations = await this.convertTranslationsToLangCodes(
      (inforLeaderboardWithRewards as any).nameTranslations || []
    )
    const currentTranslation = (
      (inforLeaderboardWithRewards as any).nameTranslations || []
    ).find((t: any) => t.languageId === langId)

    // Chuyển nameTranslations của rewards -> chỉ lấy bản dịch hiện tại (current)
    const transformed = inforLeaderboardWithRewards
      ? {
          ...inforLeaderboardWithRewards,
          nameTranslations: undefined,
          seasonRankRewards: (inforLeaderboardWithRewards as any).seasonRankRewards?.map(
            (sr: any) => ({
              ...sr,
              rewards: (sr.rewards || []).map((r: any) => ({
                ...r,
                nameTranslation:
                  ((r.nameTranslations || []).find((t: any) => t.languageId === langId)
                    ?.value as string) ?? null,
                // remove bulky translations array
                nameTranslations: undefined
              }))
            })
          )
        }
      : null

    return {
      statusCode: HttpStatus.OK,
      data: {
        ...transformed,
        nameTranslation: currentTranslation?.value ?? null,
        ...(isAdmin ? { nameTranslations } : {})
      },
      message: this.i18nService.translate(LeaderboardSeasonMessage.GET_LIST_SUCCESS, lang)
    }
  }
}
