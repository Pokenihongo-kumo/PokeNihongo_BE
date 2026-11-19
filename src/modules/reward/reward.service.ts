import { FeatureKey } from '@/common/constants/subscription.constant'
import { I18nService } from '@/i18n/i18n.service'
import { NotificationMessage, RewardMessage } from '@/i18n/message-keys'
import { LanguagesService } from '@/modules/languages/languages.service'
import { NotificationService } from '@/modules/notification/notification.service'
import { PokemonService } from '@/modules/pokemon/pokemon.service'
import { TranslationService } from '@/modules/translation/translation.service'
import { UserPokemonService } from '@/modules/user-pokemon/user-pokemon.service'
import { CreateUserRewardHistoryBody } from '@/modules/user-reward-history/dto/user-reward-history.zod-dto'
import { UserSubscriptionService } from '@/modules/user-subscription/user-subscription.service'
import { WalletService } from '@/modules/wallet/wallet.service'
import {
  InvalidForeignKeyConstraintException,
  LanguageNotExistToTranslateException,
  NotFoundRecordException
} from '@/shared/error'
import {
  isForeignKeyConstraintPrismaError,
  isNotFoundPrismaError,
  isRestrictViolationPrismaError,
  isUniqueConstraintPrismaError
} from '@/shared/helpers'
import { PaginationQuery } from '@/shared/models/request.model'
import { HttpStatus, Injectable, Logger } from '@nestjs/common'
import {
  RarityPokemon,
  RewardTarget,
  UserRewardSourceType,
  WalletType
} from '@prisma/client'
import { CreateTranslationBody } from '../translation/dto/translation.zod-dto'
import { UserRewardHistoryService } from '../user-reward-history/user-reward-history.service'
import { UserService } from '../user/user.service'
import { RewardAlreadyExistsException } from './dto/reward.error'
import {
  CreateRewardBody,
  CreateRewardBodyInput,
  UpdateRewardBody,
  UpdateRewardBodyInput
} from './dto/reward.zod-dto'
import { RewardRepo } from './reward.repo'

@Injectable()
export class RewardService {
  constructor(
    private rewardRepo: RewardRepo,
    private readonly i18nService: I18nService,
    private readonly languagesService: LanguagesService,
    private readonly translationService: TranslationService,
    private readonly userService: UserService,
    private readonly walletService: WalletService,
    private readonly pokemonService: PokemonService,
    private readonly userPokemonService: UserPokemonService,
    private readonly userRewardHistoryService: UserRewardHistoryService,
    private readonly userSubService: UserSubscriptionService,
    private readonly sharedNotificationService: NotificationService
  ) {}

  private readonly logger = new Logger(RewardService.name)

  /**
   * Map UserRewardSourceType to WalletSourceType
   */
  private mapToWalletSourceType(sourceType: UserRewardSourceType): any {
    const mapping: Record<UserRewardSourceType, string> = {
      REWARD_SERVICE: 'ADMIN_ADJUST',
      LESSON: 'LESSON_PURCHASE',
      EXERCISE: 'EVENT_REWARD',
      DAILY_REQUEST: 'DAILY_CHECKIN',
      ATTENDANCE: 'DAILY_CHECKIN',
      SEASON_REWARD: 'RANK_REWARD',
      ADMIN_ADJUST: 'ADMIN_ADJUST',
      OTHER: 'ADMIN_ADJUST',
      ACHIEVEMENT_REWARD: 'EVENT_REWARD'
    }
    return mapping[sourceType] || 'ADMIN_ADJUST'
  }

  /**
   * Map UserRewardSourceType to NotificationType
   */
  private mapToNotificationType(
    sourceType: UserRewardSourceType
  ):
    | 'REWARD'
    | 'LESSON'
    | 'EXERCISE'
    | 'ACHIEVEMENT'
    | 'SEASON'
    | 'LEVEL'
    | 'SYSTEM'
    | 'OTHER' {
    const mapping: Record<
      UserRewardSourceType,
      | 'REWARD'
      | 'LESSON'
      | 'EXERCISE'
      | 'ACHIEVEMENT'
      | 'SEASON'
      | 'LEVEL'
      | 'SYSTEM'
      | 'OTHER'
    > = {
      LESSON: 'LESSON',
      EXERCISE: 'EXERCISE',
      DAILY_REQUEST: 'REWARD',
      ATTENDANCE: 'REWARD',
      SEASON_REWARD: 'SEASON',
      ACHIEVEMENT_REWARD: 'ACHIEVEMENT',
      ADMIN_ADJUST: 'REWARD',
      REWARD_SERVICE: 'REWARD',
      OTHER: 'OTHER'
    }
    return mapping[sourceType] || 'REWARD'
  }

  private pushHistoryEntry(
    entries: CreateUserRewardHistoryBody[],
    params: {
      userId: number
      rewardId?: number
      target: RewardTarget
      amount?: number | null
      note?: string
      meta?: Record<string, any>
    }
  ) {
    const payload = this.userRewardHistoryService.createEntryPayload({
      userId: params.userId,
      rewardId: params.rewardId,
      rewardTargetSnapshot: params.target as any,
      amount: params.amount ?? null,
      sourceType: 'REWARD_SERVICE',
      note: params.note,
      meta: params.meta
    })
    entries.push(payload)
  }

  async list(pagination: PaginationQuery, lang: string = 'vi') {
    const langId = await this.languagesService.getIdByCode(lang)
    const data = await this.rewardRepo.list(pagination, langId ?? undefined)
    return data
  }

  async getListWithAllLang(pagination: PaginationQuery, lang: string = 'vi') {
    const langId = await this.languagesService.getIdByCode(lang)
    const data = await this.rewardRepo.getListWithAllLang(pagination, langId ?? undefined)

    // Build language code map for all referenced languageIds
    const allLangIds = new Set<number>()
    for (const item of data.results as any[]) {
      for (const t of item.nameTranslations ?? []) allLangIds.add(t.languageId)
    }
    const languages = await this.languagesService.getWithListId(Array.from(allLangIds))
    const codeMap = Object.fromEntries(languages.map((l) => [l.id, l.code]))

    const results = (data.results as any[]).map((item) => ({
      ...item,
      nameTranslations: (item.nameTranslations ?? []).map((t: any) => ({
        key: codeMap[t.languageId] ?? String(t.languageId),
        value: t.value
      }))
    }))

    return { ...data, results }
  }

  async findById(id: number, lang: string = 'vi') {
    const langId = await this.languagesService.getIdByCode(lang)

    if (!langId) {
      return null
    }

    const reward = await this.rewardRepo.findByIdWithLangId(id, langId)
    if (!reward) {
      throw new NotFoundRecordException()
    }

    const data = {}
    const result = {
      ...reward,
      nameTranslation: (reward as any).nameTranslations?.[0]?.value ?? null,
      descriptionTranslation: (reward as any).descriptionTranslations?.[0]?.value ?? null
    }

    return result
  }

  async findByIdWithAllLang(id: number, lang: string = 'vi') {
    const langId = await this.languagesService.getIdByCode(lang)

    const reward: any = await this.rewardRepo.findByIdWithAllLang(id)
    if (!reward) {
      throw new NotFoundRecordException()
    }

    // derive single-language name for current lang if available
    const nameTranslation = langId
      ? (reward.nameTranslations?.find((t: any) => t.languageId === langId)?.value ??
        null)
      : null

    // map array to { key: code, value }
    const languages = await this.languagesService.getWithListId(
      Array.from(new Set((reward.nameTranslations ?? []).map((t: any) => t.languageId)))
    )
    const codeMap = Object.fromEntries(languages.map((l) => [l.id, l.code]))

    const result = {
      ...reward,
      nameTranslations: (reward.nameTranslations ?? []).map((t: any) => ({
        key: codeMap[t.languageId] ?? String(t.languageId),
        value: t.value
      }))
    }

    return result
  }

  async create(
    {
      data,
      createdById
    }: {
      data: CreateRewardBodyInput
      createdById: number
    },
    lang: string = 'vi'
  ) {
    // Every write runs in this transaction: a failure leaves no reward behind
    try {
      return await this.rewardRepo.withTransaction(async (prismaTx) => {
        const nameKey = `reward.name.${Date.now()}`

        // Convert data for create
        const dataCreate: CreateRewardBody = {
          nameKey,
          rewardType: data.rewardType,
          rewardItem: data.rewardItem,
          rewardTarget: data.rewardTarget
        }

        const createdReward = await this.rewardRepo.create(
          {
            createdById,
            data: dataCreate
          },
          prismaTx
        )

        // Now we have id, create proper nameKey
        const fNameKey = `reward.name.${createdReward.id}`

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

        // Update reward with final nameKey
        const result = await this.rewardRepo.update(
          {
            id: createdReward.id,
            data: {
              nameKey: fNameKey,
              nameTranslations: translationRecords,
              rewardNameKey: fNameKey
            }
          },
          prismaTx
        )

        return {
          statusCode: HttpStatus.CREATED,
          data: result,
          message: this.i18nService.translate(RewardMessage.CREATE_SUCCESS, lang)
        }
      })
    } catch (error) {
      if (isUniqueConstraintPrismaError(error)) {
        throw new RewardAlreadyExistsException()
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
      data: UpdateRewardBodyInput
      updatedById: number
    },
    lang: string = 'vi'
  ) {
    let existingReward: any = null

    try {
      return await this.rewardRepo.withTransaction(async (prismaTx) => {
        const translationRecords: CreateTranslationBody[] = []
        // Get current record
        existingReward = await this.rewardRepo.findById(id)
        if (!existingReward) throw new NotFoundRecordException()

        // Prepare data for update
        const dataUpdate: Partial<UpdateRewardBody> = {}

        if (data.rewardType !== undefined) dataUpdate.rewardType = data.rewardType
        if (data.rewardItem !== undefined) dataUpdate.rewardItem = data.rewardItem
        if (data.rewardTarget !== undefined) dataUpdate.rewardTarget = data.rewardTarget

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
                key: existingReward.nameKey,
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

        // Update Reward main record
        const updatedReward = await this.rewardRepo.update(
          {
            id,
            updatedById,
            data: {
              ...dataUpdate,
              nameTranslations: data.nameTranslations ? translationRecords : [],
              rewardNameKey: existingReward.nameKey
            }
          },
          prismaTx
        )

        return {
          statusCode: HttpStatus.OK,
          data: updatedReward,
          message: this.i18nService.translate(RewardMessage.UPDATE_SUCCESS, lang)
        }
      })
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      if (isUniqueConstraintPrismaError(error)) {
        throw new RewardAlreadyExistsException()
      }
      if (isForeignKeyConstraintPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }

  async delete({ id, deletedById }: { id: number; deletedById: number }) {
    try {
      const existingReward = await this.rewardRepo.findDelId(id)
      if (!existingReward) {
        throw new NotFoundRecordException()
      }

      if (existingReward.deletedAt) {
        // Already soft-deleted: hard delete the name translations and the reward
        // together, so a failure (e.g. a Restrict FK from UserRewardHistory)
        // leaves both in place
        await this.rewardRepo.withTransaction(async (prismaTx) => {
          await this.translationService.deleteByKey(existingReward.nameKey, prismaTx)
          await this.rewardRepo.delete({ id, deletedById }, true, prismaTx)
        })
      } else {
        await this.rewardRepo.delete({ id, deletedById }, false)
      }

      return
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      if (isForeignKeyConstraintPrismaError(error))
        throw new InvalidForeignKeyConstraintException(
          (error.meta?.constraint as string) ?? ''
        )
      // Hard delete blocked by a Restrict relation (e.g. UserRewardHistory)
      if (isRestrictViolationPrismaError(error)) {
        throw new InvalidForeignKeyConstraintException()
      }

      throw error
    }
  }

  /**
   *
   * Convert rewards to user benefits
   * Handles EXP, POKEMON, POKE_COINS, and SPARKLES reward types
   *
   * @param rewardIds - Array of reward IDs to process
   * @param userId - User ID to receive the rewards
   * @returns Object with processed results for each reward type
   */
  //todo Kumo
  async convertRewardsWithUser(
    rewardIds: number[],
    userId: number,
    sourceType: UserRewardSourceType,
    options?: {
      reduceReward?: boolean
    },
    sourceId?: number | null
  ) {
    this.logger.log(
      `[convertRewardsWithUser] START - UserId: ${userId}, Initial RewardIds: [${rewardIds.join(', ')}], SourceType: ${sourceType}`
    )
    // giảm phần thưởng nếu đã hoàn thành bài tập trước đó
    const isReducedReward = options?.reduceReward ?? false
    const reductionMultiplier = isReducedReward ? 0.1 : 1
    // Queue-based approach to handle level-up rewards without circular dependency
    const rewardQueue: number[] = [...rewardIds]
    const processedRewardIds = new Set<number>() // Track processed rewards to avoid duplicates

    // xem có tăng không
    const valueIncrease =
      (await this.userSubService.getValueConvertByfeatureKeyAndUserId(
        FeatureKey.COIN_MULTIPLIER,
        userId
      )) * reductionMultiplier
    const valueIncreaseExp =
      (await this.userSubService.getValueConvertByfeatureKeyAndUserId(
        FeatureKey.XP_MULTIPLIER,
        userId
      )) * reductionMultiplier

    const results: any = {
      pokeCoins: null,
      sparkles: null,
      pokemons: [],
      levelsGained: 0,
      levelRewards: [] // Track rewards from level-ups
    }

    const historyEntries: CreateUserRewardHistoryBody[] = []
    const notificationType = this.mapToNotificationType(sourceType)
    const notificationsToCreate: Array<{
      titleKey: string
      bodyKey: string
      type:
        | 'REWARD'
        | 'LESSON'
        | 'EXERCISE'
        | 'ACHIEVEMENT'
        | 'SEASON'
        | 'LEVEL'
        | 'SYSTEM'
        | 'OTHER'
      metadata: any
    }> = []

    // Process rewards in queue until empty
    while (rewardQueue.length > 0) {
      const currentBatchIds = rewardQueue.splice(0, rewardQueue.length)
      this.logger.log(
        `[convertRewardsWithUser] Processing batch - RewardIds: [${currentBatchIds.join(', ')}]`
      )

      // Filter out already processed rewards
      const newRewardIds = currentBatchIds.filter((id) => !processedRewardIds.has(id))
      if (newRewardIds.length === 0) {
        this.logger.warn(
          `[convertRewardsWithUser] All rewards in batch already processed, skipping`
        )
        continue
      }

      this.logger.log(
        `[convertRewardsWithUser] New rewards to process: [${newRewardIds.join(', ')}], Already processed: [${Array.from(processedRewardIds).join(', ')}]`
      )

      // 1. Fetch all rewards by IDs using findManyByIds
      const rewards = await this.rewardRepo.findManyByIds(newRewardIds)

      this.logger.log(
        `[convertRewardsWithUser] Fetched ${rewards.length} rewards from DB for ${newRewardIds.length} requested IDs`
      )

      if (rewards.length !== newRewardIds.length) {
        const foundIds = rewards.map((r) => r.id)
        const missingIds = newRewardIds.filter((id) => !foundIds.includes(id))
        this.logger.error(
          `[convertRewardsWithUser] REWARD NOT FOUND - Requested: [${newRewardIds.join(', ')}], Found: [${foundIds.join(', ')}], Missing: [${missingIds.join(', ')}]`
        )
        throw new NotFoundRecordException()
      }

      this.logger.log(
        `[convertRewardsWithUser] Reward details: ${JSON.stringify(rewards.map((r) => ({ id: r.id, target: r.rewardTarget, item: r.rewardItem })))}`
      )

      // Mark as processed
      newRewardIds.forEach((id) => processedRewardIds.add(id))

      // 2. Group rewards by target type
      const rewardsByType: Record<RewardTarget, typeof rewards> = {
        [RewardTarget.EXP]: [],
        [RewardTarget.POKEMON]: [],
        [RewardTarget.POKE_COINS]: [],
        [RewardTarget.SPARKLES]: []
      }

      for (const reward of rewards) {
        rewardsByType[reward.rewardTarget].push(reward)
      }

      // 3. Process EXP rewards (may trigger level-ups with more rewards)
      if (rewardsByType[RewardTarget.EXP].length > 0) {
        const totalExp = rewardsByType[RewardTarget.EXP].reduce(
          (sum, r) => sum + r.rewardItem,
          0
        )
        const expResult = await this.userService.userAddExp(
          userId,
          totalExp * valueIncreaseExp
        )

        // Accumulate level gains (don't store full user data)
        if (expResult.levelsGained) {
          results.levelsGained += expResult.levelsGained
        }

        // Add level-up rewards to queue if any
        if (expResult.levelRewardIds && expResult.levelRewardIds.length > 0) {
          this.logger.log(
            `[convertRewardsWithUser] User ${userId} leveled up ${expResult.levelsGained} times, levelRewardIds from userAddExp: [${expResult.levelRewardIds.join(', ')}]`
          )
          this.logger.log(
            `[convertRewardsWithUser] Level up details: ${JSON.stringify(expResult.levelUpDetails)}`
          )

          // Fetch level reward details to include in response
          this.logger.log(
            `[convertRewardsWithUser] Fetching level reward details for IDs: [${expResult.levelRewardIds.join(', ')}]`
          )
          const levelRewardDetails = await this.rewardRepo.findManyByIds(
            expResult.levelRewardIds
          )

          this.logger.log(
            `[convertRewardsWithUser] Level rewards fetched: ${levelRewardDetails.length} out of ${expResult.levelRewardIds.length}`
          )

          if (levelRewardDetails.length !== expResult.levelRewardIds.length) {
            const foundIds = levelRewardDetails.map((r) => r.id)
            const missingIds = expResult.levelRewardIds.filter(
              (id) => !foundIds.includes(id)
            )
            this.logger.error(
              `[convertRewardsWithUser] LEVEL REWARD NOT FOUND - Requested: [${expResult.levelRewardIds.join(', ')}], Found: [${foundIds.join(', ')}], Missing: [${missingIds.join(', ')}]`
            )
          }

          // Map rewards with level progression info
          const levelUpDetails = expResult.levelUpDetails || []
          levelRewardDetails.forEach((reward, index) => {
            const levelDetail = levelUpDetails[index]
            results.levelRewards.push({
              ...reward,
              fromLevel: levelDetail?.fromLevel,
              toLevel: levelDetail?.toLevel
            })
          })

          rewardQueue.push(...expResult.levelRewardIds)
          this.logger.log(
            `[convertRewardsWithUser] Added level rewards to queue. New queue: [${rewardQueue.join(', ')}]`
          )
        }
        this.logger.log(
          `Appending history entries for EXP rewards for user: ${userId} with sourceId: ${sourceId} is number ${sourceId === undefined ? 'false' : 'true'}`
        )
        this.userRewardHistoryService.appendEntriesFromRewards(
          historyEntries,
          rewardsByType[RewardTarget.EXP],
          userId,
          RewardTarget.EXP,
          sourceType,
          valueIncreaseExp,
          sourceId ?? undefined
        )

        // Prepare EXP notification
        const finalExpAmount = totalExp * valueIncreaseExp
        notificationsToCreate.push({
          titleKey: NotificationMessage.NOTI_REWARD,
          bodyKey: NotificationMessage.YOU_HAVE_NEW_REWARD,
          type: notificationType,
          metadata: {
            exp: { amount: finalExpAmount }
          }
        })
      }

      // 4. Process POKE_COINS rewards
      if (rewardsByType[RewardTarget.POKE_COINS].length > 0) {
        const totalCoins = rewardsByType[RewardTarget.POKE_COINS].reduce(
          (sum, r) => sum + r.rewardItem,
          0
        )
        const finalAmount = totalCoins * valueIncrease
        // Balance and its wallet transaction in one transaction
        const coinsResult = await this.walletService.credit(
          {
            userId,
            type: WalletType.POKE_COINS,
            amount: finalAmount,
            createdById: userId,
            purpose: 'REWARD',
            referenceId: sourceId ?? null,
            source: this.mapToWalletSourceType(sourceType),
            description: `Received ${finalAmount} POKE_COINS from ${sourceType}`
          },
          undefined,
          // a user without this wallet gets it with the reward
          { createIfMissing: true }
        )

        // Accumulate or set result
        results.pokeCoins = coinsResult?.wallet ?? null

        this.logger.log(
          `Appending history entries for POKE_COINS rewards for user: ${userId} with sourceId: ${sourceId}`
        )
        this.userRewardHistoryService.appendEntriesFromRewards(
          historyEntries,
          rewardsByType[RewardTarget.POKE_COINS],
          userId,
          RewardTarget.POKE_COINS,
          sourceType,
          valueIncrease,
          sourceId ?? undefined
        )

        // Prepare POKE_COINS notification
        notificationsToCreate.push({
          titleKey: NotificationMessage.NOTI_REWARD,
          bodyKey: NotificationMessage.YOU_HAVE_NEW_REWARD,
          type: notificationType,
          metadata: {
            poke_coins: { amount: finalAmount }
          }
        })
      }

      // 5. Process SPARKLES rewards
      if (rewardsByType[RewardTarget.SPARKLES].length > 0) {
        const totalSparkles = rewardsByType[RewardTarget.SPARKLES].reduce(
          (sum, r) => sum + r.rewardItem,
          0
        )
        const finalAmount = totalSparkles * valueIncrease

        // Balance and its wallet transaction in one transaction
        const sparklesResult = await this.walletService.credit(
          {
            userId,
            type: WalletType.SPARKLES,
            amount: finalAmount,
            createdById: userId,
            purpose: 'REWARD',
            referenceId: sourceId ?? null,
            source: this.mapToWalletSourceType(sourceType),
            description: `Received ${finalAmount} SPARKLES from ${sourceType}`
          },
          undefined,
          // a user without this wallet gets it with the reward
          { createIfMissing: true }
        )

        // Accumulate or set result
        results.sparkles = sparklesResult?.wallet ?? null

        this.logger.log(
          `Appending history entries for SPARKLES rewards for user: ${userId} with sourceId: ${sourceId}`
        )
        this.userRewardHistoryService.appendEntriesFromRewards(
          historyEntries,
          rewardsByType[RewardTarget.SPARKLES],
          userId,
          RewardTarget.SPARKLES,
          sourceType,
          valueIncrease,
          sourceId ?? undefined
        )

        // Prepare SPARKLES notification
        notificationsToCreate.push({
          titleKey: NotificationMessage.NOTI_REWARD,
          bodyKey: NotificationMessage.YOU_HAVE_NEW_REWARD,
          type: notificationType,
          metadata: {
            sparkles: { amount: finalAmount }
          }
        })
      }

      // 6. Process POKEMON rewards (most complex)
      for (const pokemonReward of rewardsByType[RewardTarget.POKEMON]) {
        const pokemonId = pokemonReward.rewardItem

        // Check if user already has this pokemon
        const existingUserPokemon = await this.userPokemonService.findByUserAndPokemon(
          userId,
          pokemonId
        )

        if (!existingUserPokemon) {
          // User doesn't have this pokemon -> add it
          const newUserPokemon = await this.userPokemonService.insert({
            userId,
            data: {
              pokemonId,
              isMain: false
            }
          })

          // Fetch pokemon details for notification
          const pokemonDetails = await this.pokemonService.getById(pokemonId)

          results.pokemons.push({
            action: 'added',
            pokemon: newUserPokemon
          })
          this.pushHistoryEntry(historyEntries, {
            userId,
            rewardId: pokemonReward.id,
            target: RewardTarget.POKEMON,
            amount: 1,
            meta: {
              pokemonId
            }
          })

          // Prepare POKEMON notification (new pokemon)
          if (pokemonDetails) {
            notificationsToCreate.push({
              titleKey: NotificationMessage.NOTI_REWARD,
              bodyKey: NotificationMessage.YOU_HAVE_NEW_REWARD,
              type: notificationType,
              metadata: {
                pokemon: {
                  id: pokemonDetails.id,
                  name: pokemonDetails.nameJp,
                  rarity: pokemonDetails.rarity
                }
              }
            })
          }
        } else {
          // User already has this pokemon -> convert to coins based on rarity
          const pokemon = await this.pokemonService.getById(pokemonId)
          if (!pokemon) {
            throw new NotFoundRecordException()
          }

          // Calculate value: 200 * rarity_level * 0.5
          // Rarity levels: COMMON=1, UNCOMMON=2, RARE=3, EPIC=4, LEGENDARY=5
          const rarityLevels: Record<RarityPokemon, number> = {
            [RarityPokemon.COMMON]: 1,
            [RarityPokemon.UNCOMMON]: 2,
            [RarityPokemon.RARE]: 3,
            [RarityPokemon.EPIC]: 4,
            [RarityPokemon.LEGENDARY]: 5
          }

          const rarityLevel = rarityLevels[pokemon.rarity as RarityPokemon] || 1
          const coinValue = Math.floor(200 * rarityLevel * 0.5)

          // Add coins to user wallet
          const finalCoinValue = coinValue * valueIncrease
          // Balance and its wallet transaction in one transaction
          const credited = await this.walletService.credit(
            {
              userId,
              type: WalletType.SPARKLES,
              amount: finalCoinValue,
              createdById: userId,
              purpose: 'REWARD',
              referenceId: sourceId ?? null,
              source: this.mapToWalletSourceType(sourceType),
              description: `Converted duplicate Pokemon #${pokemonId} (${pokemon.nameJp}) to ${finalCoinValue} SPARKLES`
            },
            undefined,
            // a user without this wallet gets it with the reward
            { createIfMissing: true }
          )
          const updatedWallet = credited?.wallet ?? null

          results.pokemons.push({
            action: 'converted_to_coins',
            pokemon: pokemon,
            coinValue: finalCoinValue,
            wallet: updatedWallet
          })
          this.pushHistoryEntry(historyEntries, {
            userId,
            rewardId: pokemonReward.id,
            target: RewardTarget.SPARKLES,
            amount: finalCoinValue,
            note: `Converted pokemon ${pokemonId} reward to coins`,
            meta: {
              pokemonId,
              coinValue: finalCoinValue
            }
          })

          // Prepare POKEMON notification (converted to sparkles)
          notificationsToCreate.push({
            titleKey: NotificationMessage.NOTI_REWARD,
            bodyKey: NotificationMessage.YOU_HAVE_NEW_REWARD,
            type: notificationType,
            metadata: {
              pokemon: {
                id: pokemon.id,
                name: pokemon.nameJp,
                rarity: pokemon.rarity,
                converted_sparkles: { amount: finalCoinValue }
              }
            }
          })
        }
      }
    } // End of while loop

    this.logger.log(
      `[convertRewardsWithUser] COMPLETED - UserId: ${userId}, Total processed rewards: ${processedRewardIds.size}, Levels gained: ${results.levelsGained}, Level rewards: ${results.levelRewards.length}`
    )
    this.logger.log(
      `[convertRewardsWithUser] Final results: ${JSON.stringify({
        pokeCoinsUpdated: !!results.pokeCoins,
        sparklesUpdated: !!results.sparkles,
        pokemonsCount: results.pokemons.length,
        levelsGained: results.levelsGained,
        levelRewardsCount: results.levelRewards.length
      })}`
    )

    if (historyEntries.length > 0) {
      for (const entry of historyEntries) {
        try {
          await this.userRewardHistoryService.create(entry)
        } catch (error) {
          this.logger.warn(
            `Failed to record user reward history for user ${userId}: ${error?.message ?? error}`
          )
        }
      }
    }

    // Add level-up notifications (one per level)
    if (results.levelsGained > 0 && results.levelRewards.length > 0) {
      for (const levelReward of results.levelRewards) {
        const levelData: any = {
          level: {
            from: levelReward.fromLevel,
            to: levelReward.toLevel,
            reward: {}
          }
        }

        // Determine reward type and structure data accordingly
        switch (levelReward.rewardTarget) {
          case RewardTarget.SPARKLES:
            levelData.level.reward.sparkles = { amount: levelReward.rewardItem }
            break
          case RewardTarget.POKE_COINS:
            levelData.level.reward.poke_coins = { amount: levelReward.rewardItem }
            break
          case RewardTarget.EXP:
            levelData.level.reward.exp = { amount: levelReward.rewardItem }
            break
          case RewardTarget.POKEMON:
            levelData.level.reward.pokemon = { id: levelReward.rewardItem }
            break
        }

        notificationsToCreate.push({
          titleKey: NotificationMessage.NOTI_LEVEL_UP,
          bodyKey: NotificationMessage.YOU_HAVE_LEVELED_UP,
          type: 'LEVEL',
          metadata: levelData
        })
      }
    }

    // Create all notifications
    if (notificationsToCreate.length > 0) {
      try {
        const notificationResults = await Promise.allSettled(
          notificationsToCreate.map((notiData) =>
            this.sharedNotificationService.create({
              userId,
              data: {
                userId,
                titleKey: notiData.titleKey,
                bodyKey: notiData.bodyKey,
                type: notiData.type,
                data: notiData.metadata
              }
            })
          )
        )

        const createdNotifications: any[] = []
        notificationResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            createdNotifications.push(result.value)
          } else {
            this.logger.warn(
              `Failed to create ${notificationsToCreate[index].type} notification for user ${userId}: ${result.reason?.message ?? result.reason}`
            )
          }
        })

        // Send socket notifications
        if (createdNotifications.length > 0) {
          for (const notification of createdNotifications) {
            try {
              await this.sharedNotificationService.sendNotiToUserBySocket({
                userId,
                payload: {
                  type: notification.type === 'LEVEL' ? 'LEVEL_UP' : 'REWARDS_RECEIVED',
                  notificationId: notification.id,
                  userId,
                  data: notification.data,
                  timestamp: new Date().toISOString()
                }
              })
              this.logger.log(
                `[convertRewardsWithUser] Sent ${notification.type} notification to user ${userId}`
              )
            } catch (error) {
              this.logger.warn(
                `Failed to send socket notification to user ${userId}: ${error?.message ?? error}`
              )
            }
          }
        }
      } catch (error) {
        this.logger.error(
          `Error creating notifications for user ${userId}: ${error?.message ?? error}`
        )
      }
    }

    return results
  }

  async convertRewards(params: {
    rewardIds: number[]
    userId: number
    sourceType: UserRewardSourceType
  }) {
    const data = await this.convertRewardsWithUser(
      params.rewardIds,
      params.userId,
      params.sourceType
    )
    return data
  }

  // ---- Season cronjob ----

  findIdsByTargets(...args: Parameters<RewardRepo['findIdsByTargets']>) {
    return this.rewardRepo.findIdsByTargets(...args)
  }
}
