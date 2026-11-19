import { Module } from '@nestjs/common'
import { AIConversationRoomController } from './ai-conversation-room.controller'
import { AIConversationRoomRepo } from './ai-conversation-room.repo'
import { AIConversationRoomService } from './ai-conversation-room.service'

@Module({
  imports: [],
  controllers: [AIConversationRoomController],
  providers: [AIConversationRoomService, AIConversationRoomRepo],
  exports: [AIConversationRoomService, AIConversationRoomRepo]
})
export class AIConversationRoomModule {}
