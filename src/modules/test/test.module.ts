import { Module } from '@nestjs/common'
import { TestController } from './test.controller'
import { TestService } from './test.service'
import { TestRepo } from './test.repo'
import { TestSetQuestionBankModule } from '../testset-questionbank/testset-questionbank.module'
import { UserTestAttemptRepo } from '../user-test-attempt/user-test-attempt.repo'
import { UserTestModule } from '../user-test/user-test.module'

// UserTestAttemptRepo stays a local provider: UserTestAttemptModule imports
// TestModule, so importing it here would be a cycle (module-boundary plan,
// listed exception)
@Module({
  imports: [TestSetQuestionBankModule, UserTestModule],
  controllers: [TestController],
  providers: [TestService, TestRepo, UserTestAttemptRepo],
  exports: [TestService, TestRepo]
})
export class TestModule {}
