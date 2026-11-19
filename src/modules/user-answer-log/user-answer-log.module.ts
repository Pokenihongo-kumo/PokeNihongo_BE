import { Module } from '@nestjs/common'
import { UserAnswerLogController } from './user-answer-log.controller'
import { UserAnswerLogRepo } from './user-answer-log.repo'
import { UserAnswerLogService } from './user-answer-log.service'

@Module({
  imports: [],
  controllers: [UserAnswerLogController],
  providers: [UserAnswerLogService, UserAnswerLogRepo],
  exports: [UserAnswerLogService, UserAnswerLogRepo]
})
export class UserAnswerLogModule {}
