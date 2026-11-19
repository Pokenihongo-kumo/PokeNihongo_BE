import { I18nService } from '@/i18n/i18n.service'
import { UserCoreService } from '@/modules/user/user-core.service'
import { Injectable, Logger } from '@nestjs/common'
import {
  ConnectedSocket,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import { MATCHING_EVENTS, SOCKET_ROOM } from '../common/constants/socket.constant'
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
  namespace: '/user'
})
@Injectable()
export class UserGateway {
  @WebSocketServer()
  server: Server

  private readonly logger = new Logger(UserGateway.name)

  constructor(
    private readonly userCoreService: UserCoreService,
    private readonly i18nService: I18nService,
    private readonly socketServerService: SocketServerService

    // private readonly matchRoundService: MatchRoundService
  ) {}

  /**
   * Mark device as active when user connects
   */
  async handleConnection(@ConnectedSocket() client: Socket): Promise<void> {
    const userId = client.data?.userId
    const deviceId = client.data?.deviceId

    if (!userId) return

    try {
      if (deviceId) {
        await this.userCoreService.markDeviceActive(deviceId, userId)
      } else {
        // Fallback: mark all devices of user as active
        await this.userCoreService.markUserDevicesActive(userId)
      }

      this.logger.debug(
        `[UserGateway] handleConnection -> user=${userId} device=${deviceId ?? 'unknown'} marked active`
      )
    } catch (err) {
      this.logger.warn(
        `[UserGateway] handleConnection update failed for user=${userId}, device=${deviceId}: ${err?.message}`
      )
    }
  }

  /**
   * Mark device lastActive when user disconnects (app quit / network drop)
   */
  async handleDisconnect(@ConnectedSocket() client: Socket): Promise<void> {
    const userId = client.data?.userId
    const deviceId = client.data?.deviceId

    if (!userId) return

    try {
      if (deviceId) {
        await this.userCoreService.touchActiveDevice(deviceId, userId)
      } else {
        // Fallback: mark all active devices of user as inactive
        await this.userCoreService.touchActiveUserDevices(userId)
      }

      this.logger.debug(
        `[UserGateway] handleDisconnect -> user=${userId} device=${deviceId ?? 'unknown'} marked inactive`
      )
    } catch (err) {
      this.logger.warn(
        `[UserGateway] handleDisconnect update failed for user=${userId}, device=${deviceId}: ${err?.message}`
      )
    }
  }

  /**
   * Handle user joining matching room
   * userId is extracted from verified token in socket.data (set by adapter)
   */
  @SubscribeMessage(MATCHING_EVENTS.JOIN_USER_ROOM)
  handleJoinUserRoom(@ConnectedSocket() client: Socket): void {
    const userId = client.data?.userId

    if (!userId) {
      this.logger.warn(
        `[MatchingGateway] Client ${client.id} missing userId in socket.data; unauthorized`
      )
      return
    }

    const roomName = SOCKET_ROOM.getUserRoom(userId)
    client.join(roomName)

    this.logger.debug(
      `[MatchingGateway] Client ${client.id} joined room ${roomName} for user ${userId}`
    )
  }

  /**
   * Handle user leaving matching room
   */
  @SubscribeMessage(MATCHING_EVENTS.LEAVE_USER_ROOM)
  handleLeaveUserRoom(@ConnectedSocket() client: Socket): void {
    const userId = client.data?.userId

    if (!userId) {
      this.logger.warn(
        `[MatchingGateway] Client ${client.id} missing userId in socket.data; unauthorized`
      )
      return
    }

    const roomName = SOCKET_ROOM.getUserRoom(userId)
    client.leave(roomName)

    this.logger.debug(
      `[MatchingGateway] Client ${client.id} left room ${roomName} for user ${userId}`
    )
  }

  /**
   * Gửi notification cho 1 user cụ thể
   */
  notifyUser(userId: number, payload: any): void {
    const lang = this.socketServerService.getLangByUserId(userId)
    const roomName = SOCKET_ROOM.getUserRoom(userId)

    this.server.to(roomName).emit('notification', payload)

    this.logger.debug(
      `[MatchingGateway] Sent ${payload.type} to user ${userId} in room ${roomName}`
    )
  }

  /**
   * Gửi notification cho nhiều users
   */
  notifyUsers(userIds: number[], payload: any): void {
    userIds.forEach((userId) => this.notifyUser(userId, payload))
  }
}
