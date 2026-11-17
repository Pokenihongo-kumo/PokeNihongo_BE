import { I18nService } from '@/i18n/i18n.service'
import { MatchingSocketMessage } from '@/i18n/message-keys'
import { addTimeUTC } from '@/shared/helpers'
import { UserCoreService } from '@/modules/user/user-core.service'
import { TokenService } from '@/shared/services/token.service'
import { Injectable, Logger } from '@nestjs/common'
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import {
  MatchFoundPayload,
  MATCHING_EVENTS,
  MatchingEventPayload,
  MatchStatusUpdatePayload,
  SOCKET_ROOM
} from '../common/constants/socket.constant'
import { SocketServerService } from './socket-server.service'

interface MatchData {
  id: number
  status: string
  createdAt: Date
  endTime: Date
  timeLimitMs?: number
}

interface ParticipantData {
  id: number
  hasAccepted: boolean
  userId: number
  matchId: number
}

@WebSocketGateway({
  namespace: '/matching'
})
@Injectable()
export class MatchingGateway {
  @WebSocketServer()
  server: Server

  private readonly logger = new Logger(MatchingGateway.name)

  constructor(
    private readonly userCoreService: UserCoreService,
    private readonly tokenService: TokenService,
    private readonly i18nService: I18nService,
    private readonly socketServerService: SocketServerService

    // private readonly matchRoundService: MatchRoundService
  ) {}

  /**
   * Handle user joining matching room
   * userId is extracted from verified token in socket.data (set by adapter)
   */
  @SubscribeMessage(MATCHING_EVENTS.JOIN_SEARCHING_ROOM)
  handleJoinSearchingRoom(@ConnectedSocket() client: Socket): void {
    const userId = client.data?.userId

    if (!userId) {
      this.logger.warn(
        `[MatchingGateway] Client ${client.id} missing userId in socket.data; unauthorized`
      )
      return
    }

    const roomName = SOCKET_ROOM.getMatchingRoomByUserId(userId)
    client.join(roomName)

    this.logger.debug(
      `[MatchingGateway] Client ${client.id} joined room ${roomName} for user ${userId}`
    )
  }

  /**
   * Handle user leaving matching room
   */
  @SubscribeMessage(MATCHING_EVENTS.LEAVE_SEARCHING_ROOM)
  handleLeaveSearchingRoom(@ConnectedSocket() client: Socket): void {
    const userId = client.data?.userId

    if (!userId) {
      this.logger.warn(
        `[MatchingGateway] Client ${client.id} missing userId in socket.data; unauthorized`
      )
      return
    }

    const roomName = SOCKET_ROOM.getMatchingRoomByUserId(userId)
    client.leave(roomName)

    this.logger.debug(
      `[MatchingGateway] Client ${client.id} left room ${roomName} for user ${userId}`
    )
  }

  /**
   * Gửi notification cho 1 user cụ thể
   */
  notifyUser(userId: number, payload: MatchingEventPayload): void {
    const lang = this.socketServerService.getLangByUserId(userId)
    const roomName = SOCKET_ROOM.getMatchingRoomByUserId(userId)
    console.log('roomName: ', roomName)
    if (payload.type && payload.type === 'MATCHMAKING_FAILED') {
      payload.reason = this.i18nService.translate(payload.reason, lang)
    } else if (
      payload.type &&
      payload.type === 'MATCH_STATUS_UPDATE' &&
      payload.message
    ) {
      payload.message = this.i18nService.translate(payload.message, lang)
    }
    this.server.to(roomName).emit(MATCHING_EVENTS.MATCHING_EVENT, payload)

    this.logger.debug(
      `[MatchingGateway] Sent ${payload.type} to user ${userId} in room ${roomName}`
    )
  }

  /**
   * Gửi notification cho nhiều users
   */
  notifyUsers(userIds: number[], payload: MatchingEventPayload): void {
    userIds.forEach((userId) => this.notifyUser(userId, payload))
  }

  /**
   * Gửi notification match found cho 2 users với full data
   * Enhanced version: accepts full match, participant, and user data
   */
  async notifyMatchFoundEnhanced(
    match: MatchData,
    participant1: ParticipantData,
    participant2: ParticipantData
  ): Promise<void> {
    try {
      // Fetch user details for both users
      const [user1, user2] = await Promise.all([
        this.userCoreService.findUnique({ id: participant1.userId }),
        this.userCoreService.findUnique({ id: participant2.userId })
      ])

      if (!user1 || !user2) {
        this.logger.error(
          `[MatchingGateway] User not found: user1=${user1?.id}, user2=${user2?.id}`
        )
        return
      }

      // Create payload for user 1 (opponent is user 2)
      const payload1: MatchFoundPayload = {
        type: 'MATCH_FOUND',
        matchId: match.id,
        match: {
          id: match.id,
          status: match.status,
          createdAt: match.createdAt,
          endTime: match.endTime,
          timeLimitMs: match.timeLimitMs
        },
        opponent: {
          id: user2.id,
          name: user2.name,
          avatar: user2.avatar
        },
        participant: {
          id: participant1.id,
          hasAccepted: participant1.hasAccepted,
          userId: participant1.userId,
          matchId: participant1.matchId
        }
      }

      // Create payload for user 2 (opponent is user 1)
      const payload2: MatchFoundPayload = {
        type: 'MATCH_FOUND',
        matchId: match.id,
        match: {
          id: match.id,
          status: match.status,
          createdAt: match.createdAt,
          endTime: match.endTime,
          timeLimitMs: match.timeLimitMs
        },
        opponent: {
          id: user1.id,
          name: user1.name,
          avatar: user1.avatar
        },
        participant: {
          id: participant2.id,
          hasAccepted: participant2.hasAccepted,
          userId: participant2.userId,
          matchId: participant2.matchId
        }
      }

      // Send to both users
      this.notifyUser(user1.id, payload1)
      this.notifyUser(user2.id, payload2)

      this.logger.log(
        `[MatchingGateway] Enhanced notification sent to users ${user1.id} (${user1.name}) and ${user2.id} (${user2.name}) about match ${match.id}`
      )
    } catch (error) {
      this.logger.error(
        `[MatchingGateway] Error in notifyMatchFoundEnhanced: ${error.message}`,
        error.stack
      )
    }
  }

  /**
   * Gửi notification match found cho 2 users (legacy - will be enhanced)
   * TODO: This will be replaced with enhanced version that includes full match/user data
   */
  notifyMatchFound(userId1: number, userId2: number, matchId: number): void {
    // Temporary: Send basic data (will be enhanced in next step)
    this.notifyUser(userId1, {
      type: 'MATCH_FOUND',
      matchId,
      match: {
        id: matchId,
        status: 'PENDING',
        createdAt: new Date()
      },
      opponent: {
        id: userId2,
        name: 'Unknown', // Will be fetched in enhancement
        avatar: null
      },
      participant: {
        id: 0, // Will be fetched in enhancement
        hasAccepted: false,
        userId: userId1,
        matchId
      }
    })

    // Send to user 2
    this.notifyUser(userId2, {
      type: 'MATCH_FOUND',
      matchId,
      match: {
        id: matchId,
        status: 'PENDING',
        createdAt: new Date()
      },
      opponent: {
        id: userId1,
        name: 'Unknown', // Will be fetched in enhancement
        avatar: null
      },
      participant: {
        id: 0, // Will be fetched in enhancement
        hasAccepted: false,
        userId: userId2,
        matchId
      }
    })

    this.logger.log(
      `[MatchingGateway] Notified users ${userId1} and ${userId2} about match ${matchId}`
    )
  }

  /**
   * Gửi notification matchmaking failed
   */
  notifyMatchmakingFailed(userId: number, reason: string): void {
    this.notifyUser(userId, {
      type: 'MATCHMAKING_FAILED',
      reason
    })

    this.logger.log(
      `[MatchingGateway] Notified user ${userId} about matchmaking failure: ${reason}`
    )
  }

  /**
   * Gửi notification match status update
   */
  notifyMatchStatusUpdate(
    userIds: number[],
    matchId: number,
    status: string,
    message?: string
  ): void {
    const payload: MatchStatusUpdatePayload = {
      type: 'MATCH_STATUS_UPDATE',
      matchId,
      status,
      message
    }

    this.notifyUsers(userIds, payload)

    this.logger.log(
      `[MatchingGateway] Notified users ${userIds.join(', ')} about match ${matchId} status: ${status}`
    )
  }

  /**
   * Gửi notification khi Pokemon được chọn
   * Emits to the match room (matching_{matchId}) so both users receive updates
   * Data follows GetMatchRoundDetailForUserResSchema format
   */
  notifyPokemonSelected(
    matchId: number,
    matchRoundId: number,
    data: {
      match: {
        id: number
        status: string
        participants: Array<{
          id: number
          userId: number
          user: {
            id: number
            name: string
            email: string
            eloscore: number
            avatar: string | null
          }
        }>
      }
      rounds: Array<{
        id: number
        roundNumber: string
        status: string
        endTimeRound: Date | null
        participants: Array<{
          id: number
          matchParticipantId: number
          orderSelected: number
          endTimeSelected: Date | null
          selectedUserPokemonId: number | null
          selectedUserPokemon: {
            id: number
            userId: number
            pokemonId: number
            pokemon: {
              id: number
              pokedex_number: number
              nameJp: string
              nameTranslations: any
              imageUrl: string | null
              rarity: string
            } | null
          } | null
        }>
      }>
    },
    participant: any,
    opponent: any,
    timeLimitMs?: number
  ): void {
    const room = SOCKET_ROOM.getMatchRoom(matchId)

    const payload = {
      type: 'POKEMON_SELECTED',
      matchId,
      matchRoundId,
      data,
      timeLimitMs
    }

    this.server.to(room).emit(MATCHING_EVENTS.SELECT_POKEMON, payload)

    this.logger.log(
      `[MatchingGateway] Notified room ${room} about Pokemon selection in match ${matchId}, round ${matchRoundId}`
    )
  }

  /**
   * Notify user when they try to select Pokemon after timeout (already auto-selected)
   */
  notifyPokemonSelectionExpired(
    matchId: number,
    matchRoundId: number,
    userId: number,
    message: string
  ): void {
    const userMatchRoom = `match_${matchId}_user_${userId}`
    if (!userMatchRoom) {
      this.logger.warn(`[MatchingGateway] Cannot notify user ${userId} - not connected`)
      return
    }
    const lang = this.socketServerService.getLangByUserId(userId)
    const payload = {
      type: 'POKEMON_SELECTION_EXPIRED',
      matchId,
      matchRoundId,
      message
    }
    payload.message = this.i18nService.translate(payload.message, lang)
    this.server.to(userMatchRoom).emit(MATCHING_EVENTS.POKEMON_SELECTION_EXPIRED, payload)

    this.logger.log(
      `[MatchingGateway] Notified user ${userId} about expired Pokemon selection in match ${matchId}, round ${matchRoundId}`
    )
  }

  /**
   * Join match room
   * Both users in the match join the same room using matchId
   * This allows real-time updates for Pokemon selection to both players across all rounds
   */
  @SubscribeMessage(MATCHING_EVENTS.JOIN_MATCHING_ROOM)
  handleJoinMatchRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { matchId: number }
  ): void {
    const userId = client.data.userId

    if (!userId || !payload.matchId) {
      this.logger.warn(
        `[MatchingGateway] Invalid join-match-room request from socket ${client.id}`
      )
      return
    }

    // Both users join the same room using matchId with pattern: matching_{matchId}
    const room = SOCKET_ROOM.getMatchRoom(payload.matchId)
    client.join(room)

    this.logger.log(`[MatchingGateway] User ${userId} joined shared match room: ${room}`)
  }

  /**
   * Join user-specific match room
   * Allows targeting individual users within a match for notifications
   * Pattern: match_{matchId}_user_{userId}
   */
  @SubscribeMessage(MATCHING_EVENTS.JOIN_USER_MATCH_ROOM)
  handleJoinUserMatchRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { matchId: number }
  ): void {
    const userId = client.data.userId

    if (!userId || !payload.matchId) {
      this.logger.warn(
        `[MatchingGateway] Invalid join-user-match-room request from socket ${client.id}`
      )
      return
    }

    const userMatchRoom = `match_${payload.matchId}_user_${userId}`
    client.join(userMatchRoom)

    this.logger.log(
      `[MatchingGateway] User ${userId} joined user-specific match room: ${userMatchRoom}`
    )
  }

  /**
   * Leave match room
   * User leaves the shared room when they're done with the match
   */
  @SubscribeMessage(MATCHING_EVENTS.LEAVE_MATCHING_ROOM)
  handleLeaveMatchRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { matchId: number }
  ): void {
    const userId = client.data.userId

    if (!userId || !payload.matchId) {
      this.logger.warn(
        `[MatchingGateway] Invalid leave-match-room request from socket ${client.id}`
      )
      return
    }

    const room = SOCKET_ROOM.getMatchRoom(payload.matchId)
    client.leave(room)

    this.logger.log(`[MatchingGateway] User ${userId} left shared match room: ${room}`)
  }

  @SubscribeMessage(MATCHING_EVENTS.ROUND_POKES_SELECTED)
  handleGetInfoPokesRounds(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { matchId: number }
  ): void {
    const userId = client.data.userId

    if (!userId || !payload.matchId) {
      this.logger.warn(
        `[MatchingGateway] Invalid join-match-room request from socket ${client.id}`
      )
      return
    }

    // Both users join the same room using matchId with pattern: matching_{matchId}
    const room = SOCKET_ROOM.getMatchRoom(payload.matchId)
    client.join(room)

    this.logger.log(`[MatchingGateway] User ${userId} joined shared match room: ${room}`)
  }

  /**
   * Notify user that they completed all questions in the round
   * @param matchId - Match ID
   * @param userId - User who completed
   * @param participantData - MatchRoundParticipant data
   */
  notifyQuestionCompleted(matchId: number, userId: number, participantData: any): void {
    const userMatchRoom = `match_${matchId}_user_${userId}`

    this.server.to(userMatchRoom).emit(MATCHING_EVENTS.QUESTION_COMPLETED, {
      type: 'QUESTION_COMPLETED',
      matchId,
      participant: participantData
    })

    this.logger.log(
      `[MatchingGateway] Notified user ${userId} in match ${matchId} about question completion`
    )
  }

  /**
   * Notify opponent that the other user completed all questions
   * @param matchId - Match ID
   * @param opponentUserId - Opponent's user ID
   */
  notifyOpponentCompleted(matchId: number, opponentUserId: number): void {
    const userMatchRoom = `match_${matchId}_user_${opponentUserId}`
    const lang = this.socketServerService.getLangByUserId(opponentUserId)
    this.server.to(userMatchRoom).emit(MATCHING_EVENTS.OPPONENT_COMPLETED, {
      type: 'OPPONENT_COMPLETED',
      matchId,
      message: this.i18nService.translate(
        MatchingSocketMessage.OPPONENT_COMMPLETED_ANSWER,
        lang
      )
    })

    this.logger.log(
      `[MatchingGateway] Notified user ${opponentUserId} in match ${matchId} that opponent completed`
    )
  }

  /**
   * Notify user that they completed but waiting for opponent
   * @param matchId - Match ID
   * @param userId - User who completed first
   * @param roundNumber - Current round number
   */
  notifyWaitingForOpponent(matchId: number, userId: number, roundNumber: string): void {
    const userMatchRoom = `match_${matchId}_user_${userId}`
    const lang = this.socketServerService.getLangByUserId(userId)
    this.server.to(userMatchRoom).emit(MATCHING_EVENTS.WAITING_FOR_OPPONENT, {
      type: 'WAITING_FOR_OPPONENT',
      matchId,
      roundNumber,
      message: this.i18nService.translate(
        MatchingSocketMessage.WAITING_OPPONENT_COMMPLETED_ANSWER,
        lang
      )
    })

    this.logger.log(
      `[MatchingGateway] Notified user ${userId} in match ${matchId} to wait for opponent in round ${roundNumber}`
    )
  }

  /**
   * Notify user about their answer result and next question
   * @param matchId - Match ID
   * @param userId - User who answered
   * @param answerResult - Answer result data (answerId, isCorrect, pointsEarned, timeAnswerMs)
   * @param nextQuestion - Next question data or null if last question (must include roundQuestionId if present)
   */
  notifyQuestionAnswered(
    matchId: number,
    userId: number,
    answerResult: {
      roundQuestionId: number
      answerId: number
      isCorrect: boolean
      pointsEarned: number
      timeAnswerMs: number
    } | null,
    nextQuestion: any | null
  ): void {
    const userMatchRoom = `match_${matchId}_user_${userId}`

    this.server.to(userMatchRoom).emit(MATCHING_EVENTS.QUESTION_ANSWERED, {
      type: 'QUESTION_ANSWERED',
      matchId,
      answerResult,
      nextQuestion
    })
  }

  /**
   * Notify both users about round completion result
   * @param matchId - Match ID
   * @param userId1 - First user ID
   * @param userId2 - Second user ID
   * @param roundData - Complete round data with participants and winner info
   */
  notifyRoundCompleted(
    matchId: number,
    userId1: number,
    userId2: number,
    roundData: any
  ): void {
    const userMatchRoom1 = `match_${matchId}_user_${userId1}`
    const userMatchRoom2 = `match_${matchId}_user_${userId2}`

    const payload = {
      type: 'ROUND_COMPLETED',
      matchId,
      round: roundData
    }

    this.server.to(userMatchRoom1).emit(MATCHING_EVENTS.ROUND_COMPLETED, payload)
    this.server.to(userMatchRoom2).emit(MATCHING_EVENTS.ROUND_COMPLETED, payload)

    this.logger.log(
      `[MatchingGateway] Notified users ${userId1} and ${userId2} in match ${matchId} about round ${roundData.roundNumber} completion (winner: ${roundData.roundWinnerId})`
    )
  }

  /**
   * Notify both users that round is starting in X seconds
   * @param matchId - Match ID
   * @param userId1 - First user ID
   * @param userId2 - Second user ID
   * @param roundNumber - Round number that will start
   * @param delaySeconds - Seconds until round starts
   */
  notifyRoundStarting(
    matchId: number,
    userId1: number,
    userId2: number,
    roundNumber: string,
    delaySeconds: number
  ): void {
    const userMatchRoom1 = `match_${matchId}_user_${userId1}`
    const userMatchRoom2 = `match_${matchId}_user_${userId2}`
    const lang = this.socketServerService.getLangByUserId(userId1)
    // Calculate start time based on delay
    const startTime = addTimeUTC(new Date(), delaySeconds * 1000)
    const message =
      this.i18nService.translate(MatchingSocketMessage.ROUND, lang) +
      ' ' +
      roundNumber +
      ' ' +
      this.i18nService.translate(MatchingSocketMessage.WILL_START_IN, lang) +
      ' ' +
      delaySeconds +
      ' ' +
      this.i18nService.translate(MatchingSocketMessage.SECONDS, lang)
    const payload = {
      type: 'ROUND_STARTING',
      matchId,
      roundNumber,
      delaySeconds,
      startTime: startTime,
      message: message
    }

    this.server.to(userMatchRoom1).emit(MATCHING_EVENTS.ROUND_STARTING, payload)
    this.server.to(userMatchRoom2).emit(MATCHING_EVENTS.ROUND_STARTING, payload)

    this.logger.log(
      `[MatchingGateway] Notified users ${userId1} and ${userId2} that round ${roundNumber} starting in ${delaySeconds}s at ${startTime.toISOString()}`
    )
  }

  /**
   * Notify user about round start with their first question
   * @param matchId - Match ID
   * @param userId - User ID
   * @param roundData - Round data with participants and opponent
   * @param firstQuestion - User's first question (must include roundQuestionId)
   */
  notifyRoundStarted(
    matchId: number,
    userId: number,
    roundData: any,
    firstQuestion: any
  ): void {
    const userMatchRoom = `match_${matchId}_user_${userId}`

    this.server.to(userMatchRoom).emit(MATCHING_EVENTS.ROUND_STARTED, {
      type: 'ROUND_STARTED',
      matchId,
      round: roundData,
      firstQuestion
    })

    this.logger.log(
      `[MatchingGateway] Notified user ${userId} that round ${roundData.roundNumber} started with first question ${firstQuestion?.id} (roundQuestionId: ${firstQuestion?.roundQuestionId})`
    )
  }

  /**
   * Notify both users about match completion with final results
   * @param matchId - Match ID
   * @param userId1 - First user ID
   * @param userId2 - Second user ID
   * @param matchData - Complete match data with rounds and winner
   */
  notifyMatchCompleted(
    matchId: number,
    userId1: number,
    userId2: number,
    matchData: any
  ): void {
    const userMatchRoom1 = `match_${matchId}_user_${userId1}`
    const userMatchRoom2 = `match_${matchId}_user_${userId2}`
    const lang = this.socketServerService.getLangByUserId(userId1)
    const payload = {
      type: 'MATCH_COMPLETED',
      matchId,
      match: matchData,
      message: `${this.i18nService.translate(MatchingSocketMessage.MATCH_COMPLETED_WITH_WINNER, lang)} ${matchData.winner?.name || 'Unknown'}`
    }

    this.server.to(userMatchRoom1).emit(MATCHING_EVENTS.MATCH_COMPLETED, payload)
    this.server.to(userMatchRoom2).emit(MATCHING_EVENTS.MATCH_COMPLETED, payload)

    this.logger.log(
      `[MatchingGateway] Notified users ${userId1} and ${userId2} that match ${matchId} completed with winner ${matchData.winnerId}`
    )
  }
}
