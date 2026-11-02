import { Module } from '@nestjs/common'
import { UserExerciseAttemptController } from './user-exercise-attempt.controller'
import { UserExerciseAttemptRepository } from './user-exercise-attempt.repo'
import { UserExerciseAttemptService } from './user-exercise-attempt.service'
import { QuestionBankModule } from '../question-bank/question-bank.module'
import { UserAnswerLogModule } from '../user-answer-log/user-answer-log.module'
import { UserProgressModule } from '../user-progress/user-progress.module'
import { ExercisesModule } from '../exercises/exercises.module'
import { TranslationModule } from '../translation/translation.module'
import { RewardModule } from '../reward/reward.module'

@Module({
  imports: [
    QuestionBankModule,
    UserAnswerLogModule,
    UserProgressModule,
    ExercisesModule,
    TranslationModule,
    RewardModule
  ],
  controllers: [UserExerciseAttemptController],
  providers: [UserExerciseAttemptService, UserExerciseAttemptRepository],
  exports: [UserExerciseAttemptService, UserExerciseAttemptRepository]
})
export class UserExerciseAttemptModule {}
