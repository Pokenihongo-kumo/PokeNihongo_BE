import { Module } from '@nestjs/common'
import { UserAnswerLogController } from './user-answer-log.controller'
import { UserAnswerLogRepository } from './user-answer-log.repo'
import { UserAnswerLogService } from './user-answer-log.service'

@Module({
  imports: [],
  controllers: [UserAnswerLogController],
  providers: [UserAnswerLogService, UserAnswerLogRepository],
  exports: [UserAnswerLogService, UserAnswerLogRepository]
})
export class UserAnswerLogModule {}
