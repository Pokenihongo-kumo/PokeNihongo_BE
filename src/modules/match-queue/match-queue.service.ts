import { BullAction, BullQueue } from '@/common/constants/bull-action.constant'
import { I18nService } from '@/i18n/i18n.service'
import { MatchingSocketMessage, MatchQueueMessage } from '@/i18n/message-keys'
import { NotFoundRecordException } from '@/shared/error'
import {
  addTimeUTC,
  isNotFoundPrismaError,
  isUniqueConstraintPrismaError
} from '@/shared/helpers'
import { UserCoreService } from '@/modules/user/user-core.service'
import { InjectQueue } from '@nestjs/bull'
import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { QueueStatus } from '@prisma/client'
import { Queue } from 'bull'
import { MatchingGateway } from 'src/websockets/matching.gateway'
import { LeaderboardSeasonRepo } from '../leaderboard-season/leaderboard-season.repo'
import { MatchParticipantRepo } from '../match-participant/match-participant.repo'
import { MatchRepo } from '../match/match.repo'
import { UserPokemonRepo } from '../user-pokemon/user-pokemon.repo'
import {
  UserHasNotBeenJoinedSeasonException,
  UserNotFoundException
} from '../user/dto/user.error'
import {
  MatchQueueAlreadyExistsException,
  UserNotEnoughConditionException,
  YouHasMatchException
} from './dto/match-queue.error'
import { MatchQueueRepo } from './match-queue.repo'
import { MatchmakingQueueManager } from './matchmaking-queue-manager'

const TIME_KICK_USER_MS = 10000 // 10s
// Acceptance timeout (was 35000ms mislabeled). Use 25000ms = 25s
const TIME_OUT_USER_MS = 25000 // 25s

@Injectable()
export class MatchQueueService implements OnModuleInit {
  private readonly logger = new Logger(MatchQueueService.name)
  private queueManager: MatchmakingQueueManager

  constructor(
    private matchQueueRepo: MatchQueueRepo,
    private readonly i18nService: I18nService,
    private readonly userCoreService: UserCoreService,
    private readonly userPokeRepo: UserPokemonRepo,
    private readonly matchRepo: MatchRepo,
    private readonly matchParticipantRepo: MatchParticipantRepo,
    private readonly leaderboardSeasonRepo: LeaderboardSeasonRepo,
    @InjectQueue(BullQueue.MATCH_PARTICIPANT_TIMEOUT)
    private readonly matchParticipantTimeoutQueue: Queue,
    private readonly matchingGateway: MatchingGateway
  ) {
    this.queueManager = new MatchmakingQueueManager()
  }

  /**
   * Khởi tạo: load existing WAITING users vào queue manager
   */
  async onModuleInit() {
    try {
      const waitingUsers = await this.matchQueueRepo.findWaitingUsers()
      waitingUsers.forEach((user) => {
        this.queueManager.addUser(user.userId, user.userElo)
      })
      this.logger.log(
        `[QueueManager] Initialized with ${waitingUsers.length} waiting users`
      )
    } catch (error) {
      this.logger.error('[QueueManager] Error initializing queue:', error)
    }
  }

  /**
   * Hàm xử lý matchmaking - được gọi từ cronjob
   * 1. Cập nhật range ELO của tất cả users
   * 2. Kick users timeout
   * 3. Tìm và tạo match cho các cặp phù hợp
   */
  async handleMatchmakingRun(): Promise<void> {
    try {
      const queueSize = this.queueManager.getQueueSize()
      if (queueSize === 0) {
        // this.logger.debug('[MatchmakingRun] No users in queue')
        return
      }

      this.logger.debug(`[MatchmakingRun] Processing ${queueSize} users in queue`)

      // 1. Cập nhật range ELO cho tất cả users
      this.queueManager.updateRanges()

      // 2. Kick users đã timeout (đạt max range > 10s)
      const usersToKick = this.queueManager.getUsersToKick()
      for (const userId of usersToKick) {
        await this.kickUserFromQueue(userId, MatchingSocketMessage.DO_NOT_HAVE_OPONENT)
      }

      // 3. Tìm match
      let matchFound = this.queueManager.findMatch()
      while (matchFound) {
        const [userId1, userId2] = matchFound
        await this.createMatchForUsers(userId1, userId2)
        matchFound = this.queueManager.findMatch() // Tiếp tục tìm cặp tiếp theo
      }
    } catch (error) {
      this.logger.error('[MatchmakingRun] Error processing matchmaking:', error)
    }
  }

  /**
   * Kick user khỏi queue và thông báo
   */
  private async kickUserFromQueue(userId: number, reason: string): Promise<void> {
    try {
      this.logger.log(`[MatchmakingRun] Kicking user ${userId}: ${reason}`)

      // Xóa khỏi in-memory queue
      this.queueManager.removeUser(userId)

      // Xóa khỏi DB
      await this.matchQueueRepo.delete({ deletedById: userId })

      // Send notification to user via WebSocket
      this.matchingGateway.notifyMatchmakingFailed(userId, reason)
    } catch (error) {
      this.logger.error(`[MatchmakingRun] Error kicking user ${userId}:`, error)
    }
  }

  /**
   * Tạo Match và MatchParticipant cho 2 users
   */
  private async createMatchForUsers(userId1: number, userId2: number): Promise<void> {
    try {
      this.logger.log(
        `[MatchmakingRun] Creating match for users ${userId1} and ${userId2}`
      )

      // Lấy active leaderboard season
      const activeSeason = await this.leaderboardSeasonRepo.findActiveSeason()
      if (!activeSeason) {
        this.logger.error('[MatchmakingRun] No active leaderboard season found')
        return
      }

      let createdMatchId: number = 0
      let matchData: any
      let participant1Data: any
      let participant2Data: any

      await this.matchRepo.withTransaction(async (prismaTx) => {
        // 1. Tạo Match
        const match = await this.matchRepo.create(
          {
            createdById: null,
            data: {
              leaderboardSeasonId: activeSeason.id
            }
          },
          prismaTx
        )

        createdMatchId = match.id
        matchData = match

        // 2. Tạo 2 MatchParticipant
        const [participant1, participant2] = await Promise.all([
          this.matchParticipantRepo.create(
            {
              createdById: userId1,
              data: {
                matchId: match.id,
                userId: userId1
              }
            },
            prismaTx
          ),
          this.matchParticipantRepo.create(
            {
              createdById: userId2,
              data: {
                matchId: match.id,
                userId: userId2
              }
            },
            prismaTx
          )
        ])

        participant1Data = participant1
        participant2Data = participant2

        // 3. Schedule Bull jobs cho timeout (25s)
        const job1 = await this.matchParticipantTimeoutQueue.add(
          BullAction.CHECK_ACCEPTANCE_TIMEOUT,
          {
            matchParticipantId: participant1.id,
            matchId: match.id,
            userId: userId1
          },
          { delay: TIME_OUT_USER_MS }
        )
        const job2 = await this.matchParticipantTimeoutQueue.add(
          BullAction.CHECK_ACCEPTANCE_TIMEOUT,
          {
            matchParticipantId: participant2.id,
            matchId: match.id,
            userId: userId2
          },
          { delay: TIME_OUT_USER_MS }
        )

        const [state1, state2] = await Promise.all([
          // @ts-ignore
          job1.getState?.(),
          // @ts-ignore
          job2.getState?.()
        ])

        this.logger.log(
          `[MatchmakingRun] Scheduled timeout jobs: p1=${participant1.id}/job=${job1.id}/state=${state1}, p2=${participant2.id}/job=${job2.id}/state=${state2}, delay=${TIME_OUT_USER_MS}ms`
        )

        // 4. Xóa 2 users khỏi MatchQueue (DB)
        await Promise.all([
          prismaTx.matchQueue.delete({ where: { userId: userId1 } }),
          prismaTx.matchQueue.delete({ where: { userId: userId2 } })
        ])

        this.logger.log(
          `[MatchmakingRun] Match ${match.id} created successfully for users ${userId1} and ${userId2}`
        )
      })

      // 4. Xóa 2 users khỏi in-memory queue
      this.queueManager.removeUser(userId1)
      this.queueManager.removeUser(userId2)

      // 5. Send notification to both users via WebSocket with full data
      await this.matchingGateway.notifyMatchFoundEnhanced(
        {
          id: matchData.id,
          status: matchData.status,
          createdAt: matchData.createdAt,
          endTime: addTimeUTC(new Date(), TIME_OUT_USER_MS),
          timeLimitMs: TIME_OUT_USER_MS
        },
        {
          id: participant1Data.id,
          hasAccepted: participant1Data.hasAccepted,
          userId: participant1Data.userId,
          matchId: participant1Data.matchId
        },
        {
          id: participant2Data.id,
          hasAccepted: participant2Data.hasAccepted,
          userId: participant2Data.userId,
          matchId: participant2Data.matchId
        }
      )
    } catch (error) {
      this.logger.error(
        `[MatchmakingRun] Error creating match for users ${userId1} and ${userId2}:`,
        error
      )
    }
  }

  async create(
    {
      createdById
    }: {
      createdById: number
    },
    lang: string = 'vi'
  ) {
    try {
      const activeSeasonNow = await this.leaderboardSeasonRepo.findActiveSeason()
      if (!activeSeasonNow) {
        throw new NotFoundRecordException()
      }
      const [user, existingMatching, hasJoinedSeason, userPokemons] = await Promise.all([
        this.userCoreService.findUniqueWithLevel({
          id: createdById
        }),
        this.matchRepo.findActiveMatchByUserId(createdById),
        this.matchRepo.checkUserHasJoinedSeason(createdById, activeSeasonNow.id),
        this.userPokeRepo.countPokemonByUser(createdById)
      ])

      if (!user) {
        throw new UserNotFoundException()
      }
      // kiem tra xem user co dang trong tran khong

      if (existingMatching) {
        throw new YouHasMatchException()
      }
      // user da join mua chua ?

      if (!hasJoinedSeason) {
        throw new UserHasNotBeenJoinedSeasonException()
      }

      // user du level 5 chua ?, du 6 pokemon chua?

      if ((user.level?.levelNumber || 0) < 1 || userPokemons < 5) {
        const requiredLevel = 1
        const requiredPokemons = 5

        const msg =
          this.i18nService.translate(MatchQueueMessage.LEVEL_NEED, lang) +
          ` ${requiredLevel} ` +
          this.i18nService.translate(MatchQueueMessage.AMOUNT_POKEMON_NEED, lang) +
          ` ${requiredPokemons}`

        console.log(msg)
        throw new UserNotEnoughConditionException(msg)
      }

      const userElo = user?.eloscore || 0

      // Tạo matchQueue trong DB
      const result = await this.matchQueueRepo.create({
        createdById,
        data: {
          userId: createdById,
          userElo,
          status: QueueStatus.WAITING
        }
      })

      // Thêm vào in-memory queue manager
      this.queueManager.addUser(createdById, userElo)

      this.logger.log(`[MatchQueue] User ${createdById} joined queue with ELO ${userElo}`)

      return {
        data: result,
        message: this.i18nService.translate(MatchQueueMessage.CREATE_SUCCESS, lang)
      }
    } catch (error) {
      if (isUniqueConstraintPrismaError(error)) {
        throw new MatchQueueAlreadyExistsException()
      }
      if (isNotFoundPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }

  async delete({ deletedById }: { deletedById: number }, lang: string = 'vi') {
    try {
      await this.matchQueueRepo.delete({
        deletedById
      })

      // Xóa khỏi in-memory queue manager
      this.queueManager.removeUser(deletedById)

      this.logger.log(`[MatchQueue] User ${deletedById} left queue`)

      return {
        data: null,
        message: this.i18nService.translate(MatchQueueMessage.DELETE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }
}
