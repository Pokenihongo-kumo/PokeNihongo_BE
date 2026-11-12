import { Module } from '@nestjs/common'
import { TestSetQuestionBankController } from './testset-questionbank.controller'
import { TestSetQuestionBankService } from './testset-questionbank.service'
import { TestSetQuestionBankRepo } from './testset-questionbank.repo'
import { SharedModule } from '@/shared/shared.module'
import { QuestionBankModule } from '@/modules/question-bank/question-bank.module'
import { TranslationModule } from '@/modules/translation/translation.module'

@Module({
  imports: [SharedModule, QuestionBankModule, TranslationModule],
  controllers: [TestSetQuestionBankController],
  providers: [TestSetQuestionBankService, TestSetQuestionBankRepo],
  exports: [TestSetQuestionBankService, TestSetQuestionBankRepo]
})
export class TestSetQuestionBankModule {}
