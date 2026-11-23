import { Logger } from '@nestjs/common'
import { OnGatewayInit, WebSocketGateway } from '@nestjs/websockets'
import { Server } from 'socket.io'
import { SocketServerService } from './socket-server.service'

@WebSocketGateway()
export class InitializerGateway implements OnGatewayInit {
  private readonly logger = new Logger(InitializerGateway.name)

  constructor(private readonly socketServerService: SocketServerService) {}

  afterInit(server: Server) {
    this.socketServerService.server = server
    this.logger.log('Socket.IO server initialized')
  }
}
