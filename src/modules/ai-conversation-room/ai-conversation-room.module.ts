import { Module } from '@nestjs/common'
import { AIConversationRoomController } from './ai-conversation-room.controller'
import { AIConversationRoomRepository } from './ai-conversation-room.repo'
import { AIConversationRoomService } from './ai-conversation-room.service'

@Module({
  imports: [],
  controllers: [AIConversationRoomController],
  providers: [AIConversationRoomService, AIConversationRoomRepository],
  exports: [AIConversationRoomService, AIConversationRoomRepository]
})
export class AIConversationRoomModule {}
