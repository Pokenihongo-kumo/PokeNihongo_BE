import { Module } from '@nestjs/common'
import { UserAIConversationController } from './user-ai-conversation.controller'
import { UserAIConversationRepo } from './user-ai-conversation.repo'
import { UserAIConversationService } from './user-ai-conversation.service'

@Module({
  imports: [],
  controllers: [UserAIConversationController],
  providers: [UserAIConversationService, UserAIConversationRepo],
  exports: [UserAIConversationService, UserAIConversationRepo]
})
export class UserAIConversationModule {}
