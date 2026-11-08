import { MailService } from '@/3rdService/mail/mail.service'
import { I18nService } from '@/i18n/i18n.service'
import { AuthMessage, ENTITY_MESSAGE, UserMessage } from '@/i18n/message-keys'
import { LevelRepo } from '@/modules/level/level.repo'
import { UserPokemonRepo } from '@/modules/user-pokemon/user-pokemon.repo'
import { NotFoundRecordException } from '@/shared/error'
import {
  convertEloToRank,
  isForeignKeyConstraintPrismaError,
  isNotFoundPrismaError,
  isUniqueConstraintPrismaError
} from '@/shared/helpers'
import { PaginationQueryType } from '@/shared/models/request.model'
import { SharedUserRepository } from '@/shared/repositories/shared-user.repo'
import { HttpStatus, Injectable, Logger } from '@nestjs/common'
import { UserStatus } from '@prisma/client'
import * as bcrypt from 'bcrypt'
import { LanguagesRepo } from '../languages/languages.repo'
import { NotStartedLeaderboardSeasonException } from '../leaderboard-season/dto/leaderboard-season.error'
import { LeaderboardSeasonRepo } from '../leaderboard-season/leaderboard-season.repo'
import { MatchRepo } from '../match/match.repo'
import { UserPokemonNotFoundException } from '../user-pokemon/dto/user-pokemon.error'
import { UserProgressService } from '../user-progress/user-progress.service'
import { UserSeasonHistoryRepo } from '../user-season-history/user-season-history.repo'
import { WalletService } from '../wallet/wallet.service'
import { EmailAlreadyExistsException, UserNotFoundException } from './dto/user.error'
import {
  CreateUserBodyType,
  SetMainPokemonBodyType,
  UpdateUserBodyType
} from './entities/user.entity'
import { UserRepo } from './user.repo'

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name)

  constructor(
    private userRepo: UserRepo,
    private mailService: MailService,
    private userPokemonRepo: UserPokemonRepo,
    private i18nService: I18nService,
    private levelRepo: LevelRepo,
    private walletSer: WalletService,
    private readonly sharedUserRepository: SharedUserRepository,
    private readonly leaderboardSeasonRepo: LeaderboardSeasonRepo,
    private readonly matchRepo: MatchRepo,
    private readonly userSeaHistoryRepo: UserSeasonHistoryRepo,
    private readonly langRepo: LanguagesRepo,
    private readonly userProgressService: UserProgressService
  ) {}

  /**
   * Generate random password with 8 characters
   */
  private generateRandomPassword(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let password = ''
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return password
  }

  async list(pagination: PaginationQueryType, lang: string = 'vi') {
    const data = await this.userRepo.list(pagination)
    return {
      statusCode: 200,
      data,
      message: this.i18nService.translate(UserMessage.GET_LIST_SUCCESS, lang)
    }
  }

  async findById(id: number, lang: string = 'vi') {
    const user = await this.userRepo.findById(id)
    if (!user) {
      throw new UserNotFoundException()
    }
    return {
      statusCode: 200,
      data: user,
      message: this.i18nService.translate(UserMessage.GET_DETAIL_SUCCESS, lang)
    }
  }

  async create(
    { data, createdById }: { data: CreateUserBodyType; createdById: number },
    lang: string = 'vi'
  ) {
    try {
      // Check if email already exists
      const existingUser = await this.userRepo.findByEmail(data.email)
      if (existingUser) {
        throw new EmailAlreadyExistsException()
      }

      // Generate random password
      const randomPassword = this.generateRandomPassword()

      // Hash password
      const hashedPassword = await bcrypt.hash(randomPassword, 10)

      const result = await this.userRepo.create({
        createdById,
        data: {
          ...data,
          password: hashedPassword,
          status: UserStatus.ACTIVE
        }
      })

      // Send email with password
      const emailLower = data.email.toLowerCase()
      const template = 'account'
      const content = 'TÀI KHOẢN CỦA BẠN ĐÃ ĐƯỢC TẠO: '
      const bodyContent = 'Vui lòng nhập EMAIL và PASSWORD để có thể đăng nhập.'
      console.log('password: ', randomPassword)

      await this.mailService.sendEmailPasswordAccount(
        emailLower,
        template,
        content,
        bodyContent,
        data.email,
        randomPassword
      )

      // Remove password from response
      const { password, ...userWithoutPassword } = result

      //tao wallet
      await this.walletSer.generateWalletByUserId(userWithoutPassword.id)

      return {
        statusCode: 201,
        data: userWithoutPassword,
        message: this.i18nService.translate(UserMessage.CREATE_SUCCESS, lang)
      }
    } catch (error) {
      if (isUniqueConstraintPrismaError(error)) {
        throw new EmailAlreadyExistsException()
      }
      if (isNotFoundPrismaError(error)) {
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
      data: UpdateUserBodyType
      updatedById: number
    },
    lang: string = 'vi'
  ) {
    try {
      const existUser = await this.userRepo.findById(id)
      if (!existUser) {
        throw new UserNotFoundException()
      }

      let updateData = { ...data }

      // Kiểm tra password nếu có trong data
      if (data.password) {
        // Kiểm tra password mới có giống password cũ không
        const isSamePassword = await bcrypt.compare(data.password, existUser.password)

        if (isSamePassword) {
          // Password giống nhau, loại bỏ password khỏi update data
          const { password, ...dataWithoutPassword } = updateData
          updateData = dataWithoutPassword
        } else {
          // Password khác, hash password mới
          const hashedPassword = await bcrypt.hash(data.password, 10)
          updateData.password = hashedPassword
        }
      }

      const result = await this.userRepo.update({
        id,
        updatedById,
        data: updateData
      })

      // Remove password from response
      const { password, ...userWithoutPassword } = result

      return {
        statusCode: 200,
        data: userWithoutPassword,
        message: this.i18nService.translate(UserMessage.UPDATE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new UserNotFoundException()
      }
      if (isUniqueConstraintPrismaError(error)) {
        throw new EmailAlreadyExistsException()
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
      const existUser = await this.userRepo.findById(id)
      if (!existUser) {
        throw new UserNotFoundException()
      }

      await this.userRepo.delete({
        id,
        deletedById
      })

      return {
        statusCode: 200,
        data: null,
        message: this.i18nService.translate(UserMessage.DELETE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new UserNotFoundException()
      }
      throw error
    }
  }

  async setMainPokemon(
    userId: number,
    data: SetMainPokemonBodyType,
    lang: string = 'vi'
  ) {
    try {
      // Check if user exists
      const user = await this.userRepo.findById(userId)
      if (!user) {
        throw new UserNotFoundException()
      }

      // Check if user owns this Pokemon
      const userPokemon = await this.userPokemonRepo.findByUserAndPokemon(
        userId,
        data.pokemonId
      )
      if (!userPokemon) {
        throw new UserPokemonNotFoundException()
      }

      // Unset main for all user's pokemon first
      await this.userPokemonRepo.unsetMainPokemon(userId)

      // Set the selected pokemon as main
      await this.userPokemonRepo.update({
        id: userPokemon.id,
        data: { isMain: true }
      })

      return {
        statusCode: HttpStatus.OK,
        data: null,
        message: this.i18nService.translate(UserMessage.SET_MAIN_POKEMON_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new UserNotFoundException()
      }
      throw error
    }
  }

  /**
   * Add experience to user and handle level up progression
   * Similar to Pokemon handleLevelUp logic but for user levels
   *
   * @param userId - User ID to add experience to
   * @param expToAdd - Amount of experience to add
   * @param lang - Language for response messages
   * @returns User level up result with details
   */
  async userAddExp(userId: number, expToAdd: number, lang: string = 'vi') {
    try {
      // Find user with current level
      const user = await this.userRepo.findById(userId)
      if (!user) {
        throw new UserNotFoundException()
      }

      // If user doesn't have a level, assign first user level
      if (!(user as any).level) {
        const firstLevel = await this.levelRepo.getFirstLevelUser()
        if (firstLevel) {
          await this.userRepo.update({
            id: userId,
            updatedById: userId,
            data: { levelId: firstLevel.id, exp: 0 }
          })
          // Reload user with level
          const updatedUser = await this.userRepo.findById(userId)
          if (updatedUser) {
            ;(user as any).level = (updatedUser as any).level
            user.levelId = updatedUser.levelId
          }
        }
      }

      const newTotalExp = user.exp + expToAdd
      const levelUpResult = await this.handleUserLevelUp(user, newTotalExp)

      return {
        statusCode: HttpStatus.OK,
        data: {
          ...levelUpResult,
          levelRewardIds: levelUpResult.levelRewardIds || [],
          levelUpDetails: levelUpResult.levelUpDetails || []
        },
        message: this.i18nService.translate(UserMessage.UPDATE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new UserNotFoundException()
      }
      throw error
    }
  }

  /**
   * Handle user level up logic with recursive progression
   * Similar to Pokemon handleLevelUp but for user levels
   *
   * @param user - User object with current level
   * @param newExp - New total experience amount
   * @returns Level up result with progression details
   */
  private async handleUserLevelUp(user: any, newExp: number) {
    this.logger.log(
      `[handleUserLevelUp] START - UserId: ${user.id}, CurrentLevel: ${(user as any).level?.levelNumber}, CurrentExp: ${user.exp}, NewExp: ${newExp}`
    )

    let currentLevel = (user as any).level
    let currentExp = newExp
    let leveledUp = false
    let levelsGained = 0
    let expUpdated = false
    const levelRewardIds: number[] = [] // Collect reward IDs from level-ups
    const levelUpDetails: Array<{
      fromLevel: number
      toLevel: number
      rewardId: number | null
    }> = [] // Track each level transition

    // Keep checking for level ups while EXP is sufficient
    while (currentLevel && currentExp >= currentLevel.requiredExp) {
      this.logger.log(
        `[handleUserLevelUp] Checking level up - CurrentLevel: ${currentLevel.levelNumber}, RequiredExp: ${currentLevel.requiredExp}, CurrentExp: ${currentExp}`
      )

      // Find next level
      const nextLevel = await this.levelRepo.findByLevelAndType(
        currentLevel.levelNumber + 1,
        currentLevel.levelType as any
      )

      if (!nextLevel) {
        this.logger.log(
          `[handleUserLevelUp] No more levels available after level ${currentLevel.levelNumber}`
        )
        // No more levels available, keep remaining EXP
        await this.userRepo.update({
          id: user.id,
          updatedById: user.id,
          data: { exp: currentExp }
        })
        expUpdated = true
        break
      }

      // Level up! Calculate remaining EXP after leveling up
      const remainingExp = currentExp - currentLevel.requiredExp

      this.logger.log(
        `[handleUserLevelUp] LEVEL UP! ${currentLevel.levelNumber} -> ${nextLevel.levelNumber}, NextLevel RewardId: ${nextLevel.rewardId}, RemainingExp: ${remainingExp}`
      )

      // Track this level transition
      const levelTransition = {
        fromLevel: currentLevel.levelNumber,
        toLevel: nextLevel.levelNumber,
        rewardId: nextLevel.rewardId || null
      }
      levelUpDetails.push(levelTransition)

      // Collect reward ID if this level has one
      if (nextLevel.rewardId) {
        this.logger.log(
          `[handleUserLevelUp] Adding rewardId ${nextLevel.rewardId} for level ${nextLevel.levelNumber}`
        )
        levelRewardIds.push(nextLevel.rewardId)
      } else {
        this.logger.warn(
          `[handleUserLevelUp] No reward for level ${nextLevel.levelNumber}`
        )
      }

      // Update user level and continue with remaining EXP
      await this.userRepo.update({
        id: user.id,
        updatedById: user.id,
        data: {
          levelId: nextLevel.id,
          exp: remainingExp
        }
      })

      currentLevel = nextLevel
      currentExp = remainingExp
      leveledUp = true
      levelsGained++
    }

    // If there's remaining EXP but no level up happened, just update EXP
    if (!leveledUp && !expUpdated) {
      await this.userRepo.update({
        id: user.id,
        updatedById: user.id,
        data: { exp: currentExp }
      })
    } else if (leveledUp && currentExp > 0 && currentLevel && !expUpdated) {
      // If leveled up but still has remaining EXP, ensure it doesn't exceed current level's requiredExp
      const finalExp = Math.min(currentExp, currentLevel.requiredExp)
      await this.userRepo.update({
        id: user.id,
        updatedById: user.id,
        data: { exp: finalExp }
      })
      currentExp = finalExp
    }

    // Get updated user data
    const updatedUser = await this.userRepo.findById(user.id)

    this.logger.log(
      `[handleUserLevelUp] COMPLETED - UserId: ${user.id}, LeveledUp: ${leveledUp}, LevelsGained: ${levelsGained}, FinalLevel: ${currentLevel?.levelNumber}, FinalExp: ${currentExp}`
    )
    this.logger.log(
      `[handleUserLevelUp] RewardIds collected: [${levelRewardIds.join(', ')}]`
    )
    this.logger.log(
      `[handleUserLevelUp] LevelUpDetails: ${JSON.stringify(levelUpDetails)}`
    )

    return {
      ...updatedUser,
      leveledUp,
      levelsGained,
      finalExp: currentExp,
      levelRewardIds, // Return collected reward IDs
      levelUpDetails // Return level transition details
    }
  }

  /**
   * Add free coins to user
   * @param userId - User ID to add coins to
   * @param amount - Amount of coins to add
   * @param lang - Language for response messages
   */
  async addFreeCoins(userId: number, amount: number, lang: string = 'vi') {
    try {
      const user = await this.userRepo.findById(userId)
      if (!user) {
        throw new UserNotFoundException()
      }

      const updatedUser = await this.userRepo.incrementFreeCoins(userId, amount)

      return {
        statusCode: HttpStatus.OK,
        data: updatedUser,
        message: this.i18nService.translate(UserMessage.UPDATE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new UserNotFoundException()
      }
      throw error
    }
  }

  async getInfoBattleWithUser(userId: number, lang: string) {
    const langId = await this.langRepo.getIdByCode(lang)
    if (!langId) {
      throw new NotFoundRecordException()
    }
    // lay ra mua hien tai cua user

    const [currentSeason, totalMatches, totalWins, currentWinStreak, userInfo] =
      await Promise.all([
        this.leaderboardSeasonRepo.findActiveSeasonWithLangIdAndUser(userId, langId),
        this.matchRepo.countMatchesByUserId(userId),
        this.matchRepo.countWinsByUserId(userId),
        this.getCurrentWinStreak(userId),
        this.userRepo.findById(userId)
      ])

    if (!currentSeason) {
      throw new NotStartedLeaderboardSeasonException()
    }

    const userHasJoinedSeason =
      await this.userSeaHistoryRepo.checkUserHasSeasonHistoryInSeason(
        userId,
        currentSeason.id
      )

    if (!userHasJoinedSeason) {
      // User hasn't joined current season yet
      // Check if there's any unclaimed reward from previous seasons
      const unclaimedHistory =
        await this.userSeaHistoryRepo.findLatestUnclaimedSeasonHistory(userId)

      if (!unclaimedHistory) {
        // No unclaimed rewards, return null data
        return {
          message: this.i18nService.translate(UserMessage.GET_DETAIL_SUCCESS, lang),
          statusCode: HttpStatus.OK,
          data: null
        }
      }

      // User has unclaimed rewards from previous season
      const seasonTranslation = (
        (unclaimedHistory.season as any).nameTranslations || []
      ).find((t: any) => t.languageId === langId)

      // Map rewards with translations
      const rewards = ((unclaimedHistory.seasonRankReward as any)?.rewards || []).map(
        (reward: any) => {
          const rewardTranslation = (reward.nameTranslations || []).find(
            (t: any) => t.languageId === langId
          )
          const { nameTranslations, ...rewardData } = reward
          return {
            ...rewardData,
            nameTranslation: rewardTranslation?.value ?? null
          }
        }
      )

      return {
        message: this.i18nService.translate(UserMessage.GET_DETAIL_SUCCESS, lang),
        statusCode: HttpStatus.OK,
        data: {
          id: unclaimedHistory.id,
          hasUnclaimedReward: true,
          season: {
            id: unclaimedHistory.seasonId,
            name: seasonTranslation?.value ?? null,
            startDate: (unclaimedHistory.season as any).startDate,
            endDate: (unclaimedHistory.season as any).endDate
          },
          finalRank: unclaimedHistory.finalRank,
          finalElo: unclaimedHistory.finalElo,
          rewards
        }
      }
    }

    // Find current translation by langId
    const currentTranslation = ((currentSeason as any).nameTranslations || []).find(
      (t: any) => t.languageId === langId
    )

    const seasonInfo = currentSeason
      ? {
          id: currentSeason.id,
          name: currentTranslation?.value ?? null,
          startDate: currentSeason.startDate,
          endDate: currentSeason.endDate
        }
      : null
    return {
      message: this.i18nService.translate(UserMessage.GET_DETAIL_SUCCESS, lang),
      statusCode: HttpStatus.OK,
      data: {
        leaderboardSeason: seasonInfo,
        rank: {
          rankName: convertEloToRank((userInfo as any).eloscore || 0),
          eloscore: (userInfo as any).eloscore
        },
        totalMatches,
        totalWins,
        rateWin: totalMatches > 0 ? (totalWins / totalMatches) * 100 : 0,
        currentWinStreak
      }
    }
  }

  async getCurrentWinStreak(userId: number) {
    const matches = await this.matchRepo.getMatchesByUser(userId)

    let streak = 0

    for (const match of matches) {
      if (match.winnerId === userId) {
        streak++
      } else {
        return streak
      }
    }

    return streak
  }

  async getMatchingHisByUserId(
    userId: number,
    lang: string,
    pagination?: PaginationQueryType
  ) {
    const langId = await this.langRepo.getIdByCode(lang)

    if (!langId) {
      throw new NotFoundRecordException()
    }

    const matchHis = await this.matchRepo.getMatchesHistoryByUser(
      userId,
      langId,
      pagination
    )

    const mapFn = (match: any) => {
      const currentTranslation =
        ((match as any).leaderboardSeason?.nameTranslations || []).find(
          (t: any) => t.languageId === langId
        )?.value || ''

      const opponent = (match as any).participants.find(
        (p: any) => p.userId !== userId
      ).user

      // ✅ Handle tie case: winnerId = null
      let isWin: boolean | null = null
      let eloGain = 0

      if (match.winnerId === null) {
        // Match is a tie - both lose ELO
        isWin = null
        eloGain = -(match as any).eloLost // Both lose ELO (negative)
      } else if (match.winnerId === userId) {
        // User won
        isWin = true
        eloGain = (match as any).eloGained
      } else {
        // User lost
        isWin = false
        eloGain = -(match as any).eloLost // Negative because they lost ELO
      }

      // ✅ Calculate match duration (in milliseconds)
      const timeMatch =
        match.updatedAt && match.createdAt
          ? new Date(match.updatedAt).getTime() - new Date(match.createdAt).getTime()
          : 0

      return {
        isWin,
        leaderboardSeasonName: currentTranslation,
        eloGain,
        opponent,
        createdAt: match.createdAt,
        timeMatch
      }
    }

    if (pagination) {
      // paginated response
      const results = matchHis.results.map(mapFn)
      return {
        statusCode: HttpStatus.OK,
        data: {
          results,
          pagination: matchHis.pagination
        },
        message: this.i18nService.translate(ENTITY_MESSAGE.GET_LIST_SUCCESS, lang)
      }
    }

    // legacy: full array
    const convertMatchHisInfo = (matchHis as any).map ? (matchHis as any).map(mapFn) : []

    return {
      statusCode: HttpStatus.OK,
      data: convertMatchHisInfo,
      message: this.i18nService.translate(ENTITY_MESSAGE.GET_LIST_SUCCESS, lang)
    }
  }

  async updateLevelJLPT(
    { userId, data }: { userId: number; data: { levelJLPT: number } },
    lang: string = 'vi'
  ) {
    const user = await this.sharedUserRepository.findUnique({
      id: userId
    })
    if (!user) {
      throw new NotFoundRecordException()
    }
    const updatedUser = await this.sharedUserRepository.update(
      { id: userId },
      {
        levelJLPT: data.levelJLPT,
        updatedById: userId
      }
    )

    //Update user progress level JLPT
    await this.userProgressService.updateUserProgressLevelJlpt(userId, data.levelJLPT)

    return {
      statusCode: 200,
      data: updatedUser,
      message: this.i18nService.translate(AuthMessage.UPDATE_LEVEL_JLPT_SUCCESS, lang)
    }
  }
}
