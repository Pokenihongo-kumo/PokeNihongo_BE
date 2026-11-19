import { MatchModule } from '@/modules/match/match.module'
import { UserCoreModule } from '@/modules/user/user-core.module'
import { QuestionBankModule } from '@/modules/question-bank/question-bank.module'
import { BullQueueModule } from '@/infrastructure/queue/bull-queue.module'
import { BullQueue } from '@/common/constants/bull-action.constant'
import { RoundQuestionTimeoutProcessor } from '@/modules/round-question/round-question-timeout.processor'
import { WebsocketsModule } from '@/websockets/websockets.module'
import { Module } from '@nestjs/common'
import { RoundQuestionController } from './round-question.controller'
import { RoundCompletionService } from './round-completion.service'
import { RoundQuestionRepo } from './round-question.repo'
import { RoundQuestionService } from './round-question.service'

@Module({
  imports: [
    BullQueueModule.registerQueue(
      BullQueue.ROUND_QUESTION_TIMEOUT,
      {},
      true // Sử dụng Redis riêng cho match
    ),

    WebsocketsModule,
    QuestionBankModule,
    MatchModule,
    UserCoreModule
  ],
  controllers: [RoundQuestionController],
  providers: [
    RoundQuestionService,
    RoundQuestionRepo,
    RoundQuestionTimeoutProcessor,
    RoundCompletionService
  ],
  exports: [RoundQuestionService, RoundQuestionRepo, RoundQuestionTimeoutProcessor]
})
export class RoundQuestionModule {}
