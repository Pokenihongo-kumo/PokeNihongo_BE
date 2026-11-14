import { Module } from '@nestjs/common'
import { UserTestAttemptController } from './user-test-attempt.controller'
import { UserTestAttemptRepo } from './user-test-attempt.repo'
import { UserTestAttemptService } from './user-test-attempt.service'
import { QuestionBankModule } from '../question-bank/question-bank.module'
import { UserTestAnswerLogModule } from '../user-test-answer-log/user-test-answer-log.module'
import { TestModule } from '../test/test.module'
import { TestSetModule } from '../testset/testset.module'
import { TestSetQuestionBankModule } from '../testset-questionbank/testset-questionbank.module'
import { TranslationModule } from '../translation/translation.module'
import { PrismaService } from '@/shared/services/prisma.service'
import { UserTestRepo } from '../user-test/user-test.repo'
import { UserModule } from '../user/user.module'
import { LevelModule } from '../level/level.module'
import { UserProgressModule } from '../user-progress/user-progress.module'
import { RewardModule } from '../reward/reward.module'
import { LessonModule } from '../lesson/lesson.module'

@Module({
  imports: [
    QuestionBankModule,
    UserTestAnswerLogModule,
    TestModule,
    TestSetModule,
    TestSetQuestionBankModule,
    TranslationModule,
    UserModule,
    LevelModule,
    UserProgressModule,
    RewardModule,
    LessonModule
  ],
  controllers: [UserTestAttemptController],
  providers: [UserTestAttemptService, UserTestAttemptRepo, UserTestRepo, PrismaService],
  exports: [UserTestAttemptService, UserTestAttemptRepo]
})
export class UserTestAttemptModule {}
