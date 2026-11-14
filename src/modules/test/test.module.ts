import { Module } from '@nestjs/common'
import { TestController } from './test.controller'
import { TestService } from './test.service'
import { TestRepo } from './test.repo'
import { TestSetQuestionBankModule } from '../testset-questionbank/testset-questionbank.module'
import { UserTestAttemptRepository } from '../user-test-attempt/user-test-attempt.repo'
import { UserTestRepo } from '../user-test/user-test.repo'
import { UserTestModule } from '../user-test/user-test.module'

@Module({
  imports: [TestSetQuestionBankModule, UserTestModule],
  controllers: [TestController],
  providers: [TestService, TestRepo, UserTestAttemptRepository, UserTestRepo],
  exports: [TestService, TestRepo]
})
export class TestModule {}
