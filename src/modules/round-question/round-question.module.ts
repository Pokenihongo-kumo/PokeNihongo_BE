import { QuestionBankModule } from '@/modules/question-bank/question-bank.module'
import { BullQueueModule } from '@/3rdService/bull/bull-queue.module'
import { BullQueue } from '@/common/constants/bull-action.constant'
import { RoundQuestionTimeoutProcessor } from '@/modules/round-question/round-question-timeout.processor'
import { WebsocketsModule } from '@/websockets/websockets.module'
import { Module } from '@nestjs/common'
import { RoundQuestionController } from './round-question.controller'
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
    QuestionBankModule
  ],
  controllers: [RoundQuestionController],
  providers: [RoundQuestionService, RoundQuestionRepo, RoundQuestionTimeoutProcessor],
  exports: [RoundQuestionService, RoundQuestionRepo, RoundQuestionTimeoutProcessor]
})
export class RoundQuestionModule {}
