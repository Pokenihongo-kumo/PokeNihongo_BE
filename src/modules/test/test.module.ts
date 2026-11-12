import { Module } from '@nestjs/common'
import { TestController } from './test.controller'
import { TestService } from './test.service'
import { TestRepo } from './test.repo'
import { PrismaService } from '@/shared/services/prisma.service'
import { TranslationModule } from '../translation/translation.module'
import { LanguagesModule } from '../languages/languages.module'
import { TestSetModule } from '../testset/testset.module'
import { TestSetQuestionBankModule } from '../testset-questionbank/testset-questionbank.module'
import { UserTestAttemptRepository } from '../user-test-attempt/user-test-attempt.repo'
import { UserTestRepository } from '../user-test/user-test.repo'
import { UserTestModule } from '../user-test/user-test.module'
import { ExercisesModule } from '../exercises/exercises.module'

@Module({
  imports: [
    TranslationModule,
    LanguagesModule,
    TestSetModule,
    TestSetQuestionBankModule,
    UserTestModule,
    ExercisesModule
  ],
  controllers: [TestController],
  providers: [
    TestService,
    TestRepo,
    PrismaService,
    UserTestAttemptRepository,
    UserTestRepository
  ],
  exports: [TestService, TestRepo]
})
export class TestModule {}
