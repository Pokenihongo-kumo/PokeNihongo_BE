import { Module } from '@nestjs/common'
import { UserAIConversationController } from './user-ai-conversation.controller'
import { UserAIConversationRepository } from './user-ai-conversation.repo'
import { UserAIConversationService } from './user-ai-conversation.service'

@Module({
  imports: [],
  controllers: [UserAIConversationController],
  providers: [UserAIConversationService, UserAIConversationRepository],
  exports: [UserAIConversationService, UserAIConversationRepository]
})
export class UserAIConversationModule {}
