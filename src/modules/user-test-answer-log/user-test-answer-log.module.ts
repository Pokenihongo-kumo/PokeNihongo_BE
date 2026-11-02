import { Module } from '@nestjs/common'
import { UserTestAnswerLogController } from './user-test-answer-log.controller'
import { UserTestAnswerLogRepository } from './user-test-answer-log.repo'
import { UserTestAnswerLogService } from './user-test-answer-log.service'
import { PrismaService } from '@/shared/services/prisma.service'

@Module({
  imports: [],
  controllers: [UserTestAnswerLogController],
  providers: [UserTestAnswerLogService, UserTestAnswerLogRepository, PrismaService],
  exports: [UserTestAnswerLogService, UserTestAnswerLogRepository]
})
export class UserTestAnswerLogModule {}
